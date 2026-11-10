const CareerKnowledge = require("../models/CareerKnowledge");
const { generateEmbedding } = require("./embeddingService");

// Search career knowledge using MongoDB Vector Search
const searchCareerKnowledge = async (question) => {
  try {
    if (!question || !question.trim()) {
      throw new Error("Please provide a search question.");
    }

    // Generate embedding for the user's question
    const queryVector = await generateEmbedding(question);

    // Perform semantic vector search
    const results = await CareerKnowledge.aggregate([
      {
        $vectorSearch: {
          index: "careerVectorIndex",
          path: "embedding",
          queryVector: queryVector,
          numCandidates: 100,
          limit: 5
        }
      },
      {
        $project: {
          career: "$$ROOT",
          relevanceScore: {
            $meta: "vectorSearchScore"
          },
          matchedKeywords: { $literal: [] }
        }
      }
    ]);

    return results;

  } catch (error) {
    console.error("Career Knowledge Vector Search Error:", error);
    throw error;
  }
};

module.exports = { searchCareerKnowledge };