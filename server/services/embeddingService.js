const { pipeline } = require("@huggingface/transformers");

let embeddingPipeline = null;

// Load the embedding model
const loadEmbeddingModel = async () => {
  try {
    if (!embeddingPipeline) {
      console.log("Loading local embedding model...");

      embeddingPipeline = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );

      console.log("Embedding model loaded successfully!");
    }

    return embeddingPipeline;

  } catch (error) {
    console.error("Embedding Model Error:", error);
    throw error;
  }
};

// Generate text embedding
const generateEmbedding = async (text) => {
  try {
    const model = await loadEmbeddingModel();

    const output = await model(text, {
      pooling: "mean",
      normalize: true
    });

    return Array.from(output.data);

  } catch (error) {
    console.error("Embedding Generation Error:", error);
    throw error;
  }
};

module.exports = {
  generateEmbedding,
  loadEmbeddingModel
};