const axios = require('axios');
const Prompt = require('../models/prompt');

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

async function createOrUpdatePrompt(promptData) {
    try {
        const nameEmbedding = await generateEmbedding(promptData.name);
        const descriptionEmbedding = await generateEmbedding(promptData.description);

        const prompt = await Prompt.findOneAndUpdate(
            { name: promptData.name },
            { 
                ...promptData, 
                nameEmbedding, 
                descriptionEmbedding 
            },
            { upsert: true, new: true }
        );

        return prompt;
    } catch (error) {
        console.error('Error creating or updating prompt:', error);
        throw error;
    }
}

module.exports = {
    createOrUpdatePrompt
};