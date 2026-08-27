const mongoose = require("mongoose");

const adminMessageSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "greeting",
        "achievement",
        "notice",
        "warning",
        "account-action",
      ],
      default: "notice",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    recipientDeletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

adminMessageSchema.index({
  recipient: 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.AdminMessage ||
  mongoose.model(
    "AdminMessage",
    adminMessageSchema,
  );
