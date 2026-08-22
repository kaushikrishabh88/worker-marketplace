const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      required: true,
      trim: true,
    },

    skills: {
      type: [String],
      required: true,
      default: [],
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    experience: {
      type: String,
      required: true,
    },

    availability: {
      type: String,
      enum: [
        "full-time",
        "part-time",
        "both",
      ],
      required: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    salary: {
      type: Number,
      required: true,
      min: 0,
    },

    emoji: {
      type: String,
      default: "👨‍🍳",
    },

    avatarFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    rating: {
      type: Number,
      default: 0,
    },

    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Worker ||
  mongoose.model(
    "Worker",
    workerSchema
  );