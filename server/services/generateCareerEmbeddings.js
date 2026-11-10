const CareerKnowledge = require("../models/CareerKnowledge");
const {
  generateEmbedding
} = require("./embeddingService");

const generateCareerEmbeddings = async () => {
  try {
    const careers = await CareerKnowledge.find();

    console.log(`Found ${careers.length} career documents`);

    for (const career of careers) {
      const careerText = `
        Career: ${career.careerName}
        Category: ${career.category}
        Description: ${career.description}
        Skills: ${(career.requiredSkills || []).join(", ")}
        Qualifications: ${(career.qualification || []).join(", ")}
        Job Roles: ${(career.jobRoles || []).join(", ")}
        Roadmap: ${(career.roadmap || []).join(", ")}
      `;

      const embedding = await generateEmbedding(careerText);

      career.embedding = embedding;
      await career.save();

      console.log(`Embedding generated for: ${career.careerName}`);
    }

    console.log("All career embeddings generated successfully!");

  } catch (error) {
    console.error("Career Embedding Error:", error);
    throw error;
  }
};

module.exports = { generateCareerEmbeddings };