const mongoose = require("mongoose");

const careerKnowledgeSchema = new mongoose.Schema(
  {
    careerName: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true
    },

    description: {
      type: String,
      required: true
    },

    requiredSkills: {
      type: [String],
      default: []
    },

    qualification: {
      type: [String],
      default: []
    },

    jobRoles: {
      type: [String],
      default: []
    },

    roadmap: {
      type: [String],
      default: []
    },
    embedding: {
      type: [Number],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "CareerKnowledge",
  careerKnowledgeSchema,
  "careerKnowledge"
);