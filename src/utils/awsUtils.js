const { RekognitionClient, DetectLabelsCommand, DetectModerationLabelsCommand } = require('@aws-sdk/client-rekognition');
const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const config = require('../config');
const axios = require('axios');

const rekognition = new RekognitionClient({
    region: config.awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
});

async function analyzeDrawing(imagePath) {
    try {
        console.log('Analyzing drawing...');
        const imageBuffer = await fs.readFile(imagePath);
        const [labels, isAppropriate] = await Promise.all([
            detectLabels(imageBuffer),
            moderateContent(imageBuffer)
        ]);
        console.log('Analysis result:', { labels, isAppropriate });
        return { labels, isAppropriate };
    } catch (error) {
        console.error('Error analyzing drawing:', error);
        return { labels: [], isAppropriate: true };
    }
}

async function detectLabels(imageBuffer) {
    try {
        const params = {
            Image: {
                Bytes: imageBuffer
            },
            MaxLabels: 20,
            MinConfidence: 30
        };

        const command = new DetectLabelsCommand(params);
        const data = await rekognition.send(command);
        console.log('Raw Rekognition response:', JSON.stringify(data, null, 2));
        
        const labels = data.Labels.map(label => ({
            Name: label.Name,
            Confidence: label.Confidence
        }));
        
        console.log('Extracted labels with details:', JSON.stringify(labels, null, 2));
        return labels.map(label => label.Name);
    } catch (error) {
        console.error('Error in Rekognition label detection:', error);
        return [];
    }
}

async function moderateContent(imageBuffer) {
    try {
        const params = {
            Image: {
                Bytes: imageBuffer
            },
            MinConfidence: 60
        };

        const command = new DetectModerationLabelsCommand(params);
        const data = await rekognition.send(command);
        console.log('Moderation labels:', data.ModerationLabels);
        return data.ModerationLabels.length === 0;
    } catch (error) {
        console.error('Error in Rekognition content moderation:', error);
        return true;
    }
}

async function generateEmbedding(text) {
    try {
        const response = await axios.post('https://api.openai.com/v1/embeddings', {
            input: text,
            model: "text-embedding-ada-002"
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function calculateSimilarityScore(labels, promptName, promptNameEmbedding) {
  console.log('Calculating similarity score for labels:', labels);
  console.log('Prompt name:', promptName);

  if (!promptName) {
      console.error('Prompt name is undefined or null');
      return 0; // Return a default score if prompt name is missing
  }

  // Convert both labels and promptName to lowercase for case-insensitive comparison
  const lowerCaseLabels = labels.map(label => label.toLowerCase());
  const lowerCasePromptName = promptName.toLowerCase();

  // Check if the prompt name is in the list of labels
  const isExactMatch = lowerCaseLabels.includes(lowerCasePromptName);

  if (isExactMatch) {
      console.log('Exact match found! Prompt name is in the list of labels.');
      return 100; // Perfect score for an exact match
  } else {
      console.log('No exact match found. Calculating vector similarity...');
      if (!promptNameEmbedding) {
          console.error('Prompt name embedding is missing');
          return 0; // Return a default score if embedding is missing
      }
      
      // Generate embeddings for the labels
      const labelEmbeddings = await Promise.all(labels.map(generateEmbedding));

      // Calculate the average embedding for the labels
      const avgLabelEmbedding = labelEmbeddings.reduce((acc, curr) => acc.map((val, idx) => val + curr[idx]), new Array(labelEmbeddings[0].length).fill(0))
          .map(val => val / labelEmbeddings.length);

      // Calculate cosine similarity between avgLabelEmbedding and promptNameEmbedding
      const similarity = cosineSimilarity(avgLabelEmbedding, promptNameEmbedding);
      
      // Convert similarity to a percentage score
      const score = Math.round(similarity * 100);
      console.log('Vector similarity score:', score);
      return score;
  }
}

function cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (mag1 * mag2);
}

module.exports = {
    analyzeDrawing,
    calculateSimilarityScore,
    generateEmbedding
};