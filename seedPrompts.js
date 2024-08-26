async function seedPrompts() {
    try {
        await mongoose.connect(config.mongodbUri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB');

        for (let prompt of prompts) {
            // In a real scenario, you'd generate these embeddings using a machine learning model
            prompt.nameEmbedding = Array(1536).fill(0).map(() => Math.random());
            prompt.descriptionEmbedding = Array(1536).fill(0).map(() => Math.random());
            
            await Prompt.create(prompt);
            console.log(`Added prompt: ${prompt.name}`);
        }

        console.log('Finished seeding prompts');
    } catch (error) {
        console.error('Error seeding prompts:', error);
    } finally {
        mongoose.disconnect();
    }
}

seedPrompts();