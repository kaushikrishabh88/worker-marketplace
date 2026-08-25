const mongoose = require("mongoose");

const savedWorkerSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

savedWorkerSchema.index(
  {
    employer: 1,
    worker: 1,
  },
  {
    unique: true,
  },
);

module.exports =
  mongoose.models.SavedWorker ||
  mongoose.model("SavedWorker", savedWorkerSchema);
