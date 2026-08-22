const mongoose = require("mongoose");

const contactRequestSchema =
  new mongoose.Schema(
    {
      worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Worker",
        required: true,
      },

      workerUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      employerName: {
        type: String,
        required: true,
        trim: true,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
      },

      message: {
        type: String,
        required: true,
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "accepted",
          "rejected",
        ],
        default: "pending",
      },
    },
    {
      timestamps: true,
    }
  );

module.exports = mongoose.model(
  "ContactRequest",
  contactRequestSchema
);