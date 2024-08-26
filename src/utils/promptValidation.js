function validatePrompt(prompt) {
    if (!prompt) {
      throw new Error('Prompt is undefined');
    }
    if (!prompt._id) {
      throw new Error('Prompt _id is missing');
    }
    if (!prompt.name) {
      throw new Error('Prompt name is missing');
    }
    if (!prompt.description) {
      throw new Error('Prompt description is missing');
    }
    if (!Array.isArray(prompt.nameEmbedding) || prompt.nameEmbedding.length === 0) {
      throw new Error('Prompt nameEmbedding is invalid');
    }
    if (!Array.isArray(prompt.descriptionEmbedding) || prompt.descriptionEmbedding.length === 0) {
      throw new Error('Prompt descriptionEmbedding is invalid');
    }
    return true;
  }
  
  module.exports = { validatePrompt };