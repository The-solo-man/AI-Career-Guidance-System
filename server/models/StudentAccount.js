const mongoose = require("mongoose");

const studentAccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "StudentAccount",
  studentAccountSchema
);