const mongoose = require('mongoose');

const GameSessionSchema = new mongoose.Schema({
  status: { type: String, required: true },
  prompt: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    description: String,
    nameEmbedding: [Number],
    descriptionEmbedding: [Number]
  },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  players: [String],
  submissions: [{
    playerName: String,
    drawing: String,
    labels: [String],
    score: Number
  }]
});

GameSessionSchema.pre('save', function(next) {
  if (this.isModified('prompt')) {
    console.log('Saving GameSession with prompt:', JSON.stringify({
      _id: this.prompt._id,
      name: this.prompt.name,
      description: this.prompt.description,
      nameEmbedding: this.prompt.nameEmbedding ? 'Present' : 'Missing',
      descriptionEmbedding: this.prompt.descriptionEmbedding ? 'Present' : 'Missing'
    }, null, 2));
  }
  next();
});

module.exports = mongoose.model('GameSession', GameSessionSchema);