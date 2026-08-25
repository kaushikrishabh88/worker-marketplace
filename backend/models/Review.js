const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      index: true,
    },

    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    employerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

reviewSchema.index(
  {
    worker: 1,
    employer: 1,
  },
  {
    unique: true,
  },
);

module.exports =
  mongoose.models.Review ||
  mongoose.model("Review", reviewSchema);
