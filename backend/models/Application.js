const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    /* =====================================================
       JOB
    ===================================================== */

    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    /* =====================================================
       WORKER USER ACCOUNT
    ===================================================== */

    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* =====================================================
       WORKER PROFILE
    ===================================================== */

    workerProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },

    /* =====================================================
       APPLICATION STATUS
    ===================================================== */

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

/* =========================================================
   PREVENT DUPLICATE APPLICATIONS

   One worker can apply only once to one job.
========================================================= */

applicationSchema.index(
  {
    job: 1,
    worker: 1,
  },
  {
    unique: true,
  }
);

/* =========================================================
   EXPORT MODEL
========================================================= */

module.exports = mongoose.model(
  "Application",
  applicationSchema
);