const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    education: {
      type: String,
      required: true
    },

    skills: {
      type: String,
      required: true
    },

    interests: {
      type: String,
      required: true
    },

    programming: {
      type: String,
      required: true
    },
    experience: {
      type: String,
      required: true
    },

    career: {
      type: String,
      required: true
    },
    aiGuidance: {
      type: mongoose.Schema.Types.Mixed,
      default: null
  }
  },{
    timestamps: true
  }
);

module.exports = mongoose.model("Student", studentSchema);