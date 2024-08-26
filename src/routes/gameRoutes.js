const express = require('express');
const router = express.Router();
const GameSession = require('../models/gameSession');
const { analyzeDrawing } = require('../utils/awsUtils');
const { createOrUpdatePrompt } = require('../utils/promptUtils');
const Prompt = require('../models/prompt');

router.get('/getRandomPrompt', async (req, res) => {
  try {
    const count = await Prompt.countDocuments();
    const random = Math.floor(Math.random() * count);
    const prompt = await Prompt.findOne().skip(random);
    res.json({ prompt: prompt.name, description: prompt.description });
  } catch (error) {
    console.error('Error getting random prompt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/prompts', async (req, res) => {
  try {
    const prompt = await createOrUpdatePrompt(req.body);
    res.json(prompt);
  } catch (error) {
    console.error('Error creating/updating prompt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/prompts', async (req, res) => {
  try {
    const prompts = await Prompt.find({});
    res.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/submitDrawing', async (req, res) => {
  try {
    const { playerName, drawing } = req.body;
    const labels = await analyzeDrawing(drawing);
    // Here you would typically save the submission and calculate a score
    res.json({ success: true, labels });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
