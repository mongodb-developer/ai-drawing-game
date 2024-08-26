const mongoose = require('mongoose');

const PromptSchema = new mongoose.Schema({
    name: String,
    description: String,
    nameEmbedding: [Number],
    descriptionEmbedding: [Number]
});

module.exports = mongoose.model('Prompt', PromptSchema);