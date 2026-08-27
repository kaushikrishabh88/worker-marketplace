const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const ContactRequest = require("./models/ContactRequest");
const Worker = require("./models/Worker");
const User = require("./models/User");
const Job = require("./models/Job");
const Application = require("./models/Application");
const ContactMessage = require("./models/ContactMessage");
const Review = require("./models/Review");
const SavedWorker = require("./models/SavedWorker");
const AdminMessage = require("./models/AdminMessage");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const PasswordResetToken = require("./models/PasswordResetToken");

const { registerAvatarRoutes, publicUser } = require("./avatarRoutes");

require("dotenv").config();

/* =========================================================
   CONTACT EMAIL TRANSPORTER
========================================================= */

const contactMailTransporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.CONTACT_EMAIL_USER,
    pass: process.env.CONTACT_EMAIL_APP_PASSWORD,
  },
});

/* =========================================================
   EMAIL VERIFICATION HELPERS
========================================================= */

const EMAIL_VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:5173").replace(
    /\/$/,
    "",
  );
}

function createEmailVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_EXPIRY_MS,
  );

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
}

function getVerificationRetryAfterSeconds(user) {
  if (!user?.emailVerificationExpires) {
    return 0;
  }

  const expiryTime = new Date(user.emailVerificationExpires).getTime();

  if (Number.isNaN(expiryTime)) {
    return 0;
  }

  const issuedAt = expiryTime - EMAIL_VERIFICATION_EXPIRY_MS;
  const elapsed = Date.now() - issuedAt;

  if (
    elapsed < 0 ||
    elapsed >= EMAIL_VERIFICATION_RESEND_COOLDOWN_MS
  ) {
    return 0;
  }

  return Math.ceil(
    (EMAIL_VERIFICATION_RESEND_COOLDOWN_MS - elapsed) / 1000,
  );
}

async function sendVerificationEmail({
  user,
  rawToken,
  isResend = false,
}) {
  const verificationUrl = `${getFrontendUrl()}/verify-email?token=${rawToken}`;

  const introText = isResend
    ? "We received a request to send you a new WorkMate verification link."
    : "Thanks for creating your WorkMate account.";

  await contactMailTransporter.sendMail({
    from: `"WorkMate" <${process.env.CONTACT_EMAIL_USER}>`,

    to: user.email,

    subject: isResend
      ? "Your new WorkMate verification link"
      : "Verify your WorkMate email",

    text: `
Welcome to WorkMate!

Hi ${user.name},

${introText}

Please verify your email address by opening the link below:

${verificationUrl}

This verification link will expire in 24 hours.

For your security, only the newest verification link will work.

If you did not create or request access to this WorkMate account, you can ignore this email.

WorkMate
    `.trim(),

    html: `
      <div
        style="
          max-width: 600px;
          margin: 0 auto;
          padding: 32px;
          font-family: Arial, sans-serif;
          color: #1f2937;
        "
      >
        <h1
          style="
            margin-bottom: 8px;
            color: #0f766e;
          "
        >
          WorkMate
        </h1>

        <h2>Verify your email</h2>

        <p>Hi ${user.name},</p>

        <p>${introText}</p>

        <p>
          Please verify your email address before logging in.
        </p>

        <p style="margin: 30px 0;">
          <a
            href="${verificationUrl}"
            style="
              display: inline-block;
              padding: 14px 24px;
              border-radius: 8px;
              background: #0f766e;
              color: #ffffff;
              text-decoration: none;
              font-weight: 700;
            "
          >
            Verify Email
          </a>
        </p>

        <p>
          This verification link expires in
          <strong>24 hours</strong>.
        </p>

        <p
          style="
            margin-top: 16px;
            font-size: 13px;
            color: #6b7280;
          "
        >
          For your security, only the newest verification link will work.
        </p>

        <p
          style="
            margin-top: 28px;
            font-size: 13px;
            color: #6b7280;
          "
        >
          If you did not create or request access to this WorkMate
          account, you can ignore this email.
        </p>
      </div>
    `,
  });
}

const app = express();

/* =========================================================
   Middleware
========================================================= */

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS."));
    },
  }),
);

app.use(express.json());

/* =========================================================
   Authentication Middleware
========================================================= */

async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
    );

    const account = await User.findById(
      decoded.userId,
    ).select(
      "_id role accountStatus suspensionReason",
    );

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists.",
      });
    }

    if (
      account.role !== "admin" &&
      account.accountStatus === "suspended"
    ) {
      return res.status(403).json({
        success: false,
        accountSuspended: true,
        message:
          "Your WorkMate account has been suspended by an administrator.",
        reason:
          account.suspensionReason ||
          "Please contact WorkMate support for more information.",
      });
    }

    req.user = {
      userId: account._id,
      role: account.role,
    };

    next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error.message,
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}

/* =========================================================
   ADMIN ONLY MIDDLEWARE
========================================================= */

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  next();
}

/* =========================================================
   WORKER PROFILE VERIFICATION
========================================================= */

function isWorkerProfileComplete(worker, accountUser) {
  if (!worker || !accountUser?.emailVerified) {
    return false;
  }

  const hasSkills =
    Array.isArray(worker.skills) &&
    worker.skills.some(
      (skill) =>
        typeof skill === "string" &&
        skill.trim().length > 0,
    );

  const salary = Number(worker.salary);

  return Boolean(
    String(worker.name || "").trim() &&
      String(worker.phone || "").trim() &&
      String(worker.role || "").trim() &&
      hasSkills &&
      String(worker.location || "").trim() &&
      String(worker.experience || "").trim() &&
      ["full-time", "part-time", "both"].includes(
        worker.availability,
      ) &&
      Number.isFinite(salary) &&
      salary >= 0 &&
      String(worker.description || "").trim().length >= 3
  );
}

async function refreshWorkerVerificationByUserId(userId) {
  const [accountUser, worker] = await Promise.all([
    User.findById(userId),
    Worker.findOne({ user: userId }),
  ]);

  if (!worker) {
    return null;
  }

  const verified =
    isWorkerProfileComplete(worker, accountUser);

  if (worker.verified !== verified) {
    worker.verified = verified;
    await worker.save();
  }

  return worker;
}

/* =========================================================
   PROFILE AVATAR ROUTES
========================================================= */

registerAvatarRoutes({
  app,
  authenticateUser,
  User,
  Worker,
});

/* =========================================================
   MongoDB Connection
========================================================= */

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

/* =========================================================
   Home / Health Check
========================================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Worker Marketplace Backend is running!",
  });
});

/* =========================================================
   CONTACT US
   Public
========================================================= */

app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, userType, subject, message } = req.body;

    if (!name || !email || !phone || !userType || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All contact fields are required.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (!["employer", "worker", "other"].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid user type.",
      });
    }

    if (
      !cleanName ||
      !cleanEmail ||
      !cleanPhone ||
      !cleanSubject ||
      !cleanMessage
    ) {
      return res.status(400).json({
        success: false,
        message: "All contact fields are required.",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (cleanMessage.length > 1500) {
      return res.status(400).json({
        success: false,
        message: "Message must be 1500 characters or fewer.",
      });
    }

    const contactMessage = await ContactMessage.create({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      userType,
      subject: cleanSubject,
      message: cleanMessage,
    });

    try {
      await contactMailTransporter.sendMail({
        from: `"WorkMate Contact" <${process.env.CONTACT_EMAIL_USER}>`,

        to: process.env.CONTACT_EMAIL_TO,

        replyTo: cleanEmail,

        subject: `WorkMate Contact: ${cleanSubject}`,

        text: `
New WorkMate contact message

Name: ${cleanName}
Email: ${cleanEmail}
Phone: ${cleanPhone}
User Type: ${userType}
Subject: ${cleanSubject}

Message:
${cleanMessage}

Message ID: ${contactMessage._id}
        `.trim(),
      });
    } catch (mailError) {
      console.error("Contact email notification failed:", mailError);
    }

    return res.status(201).json({
      success: true,
      message: "Thanks for contacting WorkMate. We will get back to you soon.",
      contactMessage: {
        id: contactMessage._id,
        status: contactMessage.status,
        createdAt: contactMessage.createdAt,
      },
    });
  } catch (error) {
    console.error("Contact form error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send your message right now. Please try again.",
    });
  }
});

/* =========================================================
   ADMIN - SEND USER MESSAGE
   Worker / Employer Only
========================================================= */

app.post(
  "/api/admin/users/:id/messages",
  authenticateUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { type, title, message } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID.",
        });
      }

      const targetUser = await User.findById(id);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: "User account not found.",
        });
      }

      if (targetUser.role === "admin") {
        return res.status(403).json({
          success: false,
          message:
            "Admin accounts cannot receive moderation messages here.",
        });
      }

      const allowedTypes = [
        "greeting",
        "achievement",
        "notice",
        "warning",
        "account-action",
      ];

      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid admin message type.",
        });
      }

      const cleanTitle =
        typeof title === "string"
          ? title.trim()
          : "";

      const cleanMessage =
        typeof message === "string"
          ? message.trim()
          : "";

      if (!cleanTitle || !cleanMessage) {
        return res.status(400).json({
          success: false,
          message:
            "Message title and content are required.",
        });
      }

      if (
        cleanTitle.length > 120 ||
        cleanMessage.length > 2000
      ) {
        return res.status(400).json({
          success: false,
          message: "Admin message is too long.",
        });
      }

      const adminMessage =
        await AdminMessage.create({
          recipient: targetUser._id,
          sentBy: req.user.userId,
          type,
          title: cleanTitle,
          message: cleanMessage,
        });

      return res.status(201).json({
        success: true,
        message: "Admin message sent successfully.",
        adminMessage,
      });
    } catch (error) {
      console.error(
        "Send admin message error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message: "Unable to send admin message.",
      });
    }
  },
);

/* =========================================================
   USER - GET ADMIN MESSAGES
========================================================= */

app.get(
  "/api/admin-messages/me",
  authenticateUser,
  async (req, res) => {
    try {
      const messages = await AdminMessage.find({
        recipient: req.user.userId,
      })
        .populate("sentBy", "name role")
        .sort({ createdAt: -1 })
        .lean();

      const unreadCount = messages.filter(
        (message) => !message.read,
      ).length;

      return res.status(200).json({
        success: true,
        count: messages.length,
        unreadCount,
        messages,
      });
    } catch (error) {
      console.error(
        "Fetch admin messages error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load admin messages.",
      });
    }
  },
);

/* =========================================================
   USER - MARK ADMIN MESSAGE READ
========================================================= */

app.patch(
  "/api/admin-messages/:id/read",
  authenticateUser,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid message ID.",
        });
      }

      const adminMessage =
        await AdminMessage.findOne({
          _id: id,
          recipient: req.user.userId,
        });

      if (!adminMessage) {
        return res.status(404).json({
          success: false,
          message: "Admin message not found.",
        });
      }

      if (!adminMessage.read) {
        adminMessage.read = true;
        adminMessage.readAt = new Date();

        await adminMessage.save();
      }

      return res.status(200).json({
        success: true,
        adminMessage,
      });
    } catch (error) {
      console.error(
        "Read admin message error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update admin message.",
      });
    }
  },
);

/* =========================================================
   USER - DELETE ADMIN MESSAGE FROM INBOX
   Recipient Only
========================================================= */

app.delete(
  "/api/admin-messages/:id",
  authenticateUser,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid message ID.",
        });
      }

      const adminMessage =
        await AdminMessage.findOneAndDelete({
          _id: id,
          recipient: req.user.userId,
        });

      if (!adminMessage) {
        return res.status(404).json({
          success: false,
          message: "Admin message not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Message permanently deleted.",
      });
    } catch (error) {
      console.error(
        "Delete recipient admin message error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete admin message.",
      });
    }
  },
);

/* =========================================================
   ADMIN - SUSPEND / UNSUSPEND USER
========================================================= */

app.patch(
  "/api/admin/users/:id/suspension",
  authenticateUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { suspended, reason } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID.",
        });
      }

      if (typeof suspended !== "boolean") {
        return res.status(400).json({
          success: false,
          message:
            "Suspended must be true or false.",
        });
      }

      const targetUser = await User.findById(id);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: "User account not found.",
        });
      }

      if (targetUser.role === "admin") {
        return res.status(403).json({
          success: false,
          message:
            "Admin accounts cannot be suspended.",
        });
      }

      const cleanReason =
        typeof reason === "string"
          ? reason.trim()
          : "";

      if (suspended && cleanReason.length < 5) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a clear suspension reason.",
        });
      }

      targetUser.accountStatus =
        suspended ? "suspended" : "active";

      targetUser.suspensionReason =
        suspended ? cleanReason : "";

      targetUser.suspendedAt =
        suspended ? new Date() : null;

      targetUser.suspendedBy =
        suspended ? req.user.userId : null;

      await targetUser.save();

      await AdminMessage.create({
        recipient: targetUser._id,
        sentBy: req.user.userId,
        type: "account-action",
        title: suspended
          ? "Your WorkMate account has been suspended"
          : "Your WorkMate account has been restored",
        message: suspended
          ? `Your account has been suspended. Reason: ${cleanReason}`
          : "Your WorkMate account has been restored and is active again.",
      });

      return res.status(200).json({
        success: true,
        message: suspended
          ? "Account suspended successfully."
          : "Account restored successfully.",
        user: {
          _id: targetUser._id,
          role: targetUser.role,
          accountStatus:
            targetUser.accountStatus,
          suspensionReason:
            targetUser.suspensionReason,
          suspendedAt:
            targetUser.suspendedAt,
        },
      });
    } catch (error) {
      console.error(
        "Admin suspension error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update account status.",
      });
    }
  },
);

/* =========================================================
   ADMIN - PERMANENTLY DELETE USER
   Worker / Employer Only
========================================================= */

app.delete(
  "/api/admin/users/:id",
  authenticateUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, confirmation } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID.",
        });
      }

      if (confirmation !== "DELETE") {
        return res.status(400).json({
          success: false,
          message:
            'Type "DELETE" to confirm permanent account deletion.',
        });
      }

      const cleanReason =
        typeof reason === "string"
          ? reason.trim()
          : "";

      if (cleanReason.length < 5) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a clear deletion reason.",
        });
      }

      const targetUser = await User.findById(id);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: "User account not found.",
        });
      }

      if (targetUser.role === "admin") {
        return res.status(403).json({
          success: false,
          message:
            "Admin accounts cannot be deleted here.",
        });
      }

      const userId = targetUser._id;

      if (targetUser.role === "worker") {
        const workerProfiles =
          await Worker.find({
            user: userId,
          }).select("_id");

        const workerProfileIds =
          workerProfiles.map(
            (worker) => worker._id,
          );

        await Application.deleteMany({
          worker: userId,
        });

        await ContactRequest.deleteMany({
          $or: [
            {
              workerUser: userId,
            },
            ...(workerProfileIds.length > 0
              ? [
                  {
                    worker: {
                      $in: workerProfileIds,
                    },
                  },
                ]
              : []),
          ],
        });

        if (workerProfileIds.length > 0) {
          await Review.deleteMany({
            worker: {
              $in: workerProfileIds,
            },
          });

          await SavedWorker.deleteMany({
            worker: {
              $in: workerProfileIds,
            },
          });
        }

        await Worker.deleteMany({
          user: userId,
        });
      }

      if (targetUser.role === "employer") {
        const employerJobs =
          await Job.find({
            employer: userId,
          }).select("_id");

        const jobIds = employerJobs.map(
          (job) => job._id,
        );

        if (jobIds.length > 0) {
          await Application.deleteMany({
            job: {
              $in: jobIds,
            },
          });
        }

        await Job.deleteMany({
          employer: userId,
        });

        await ContactRequest.deleteMany({
          employer: userId,
        });

        await Review.deleteMany({
          employer: userId,
        });

        await SavedWorker.deleteMany({
          employer: userId,
        });
      }

      await PasswordResetToken.deleteMany({
        user: userId,
      });

      await AdminMessage.deleteMany({
        recipient: userId,
      });

      await User.deleteOne({
        _id: userId,
      });

      return res.status(200).json({
        success: true,
        message:
          "Account permanently deleted by administrator.",
      });
    } catch (error) {
      console.error(
        "Admin delete account error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to permanently delete account.",
      });
    }
  },
);

/* =========================================================
   ADMIN - GET WORKERS
   Admin Only
========================================================= */

app.get(
  "/api/admin/workers",
  authenticateUser,
  requireAdmin,
  async (req, res) => {
    try {
      const users = await User.find({
        role: "worker",
      })
        .select(
          "name email emailVerified role accountStatus suspensionReason suspendedAt suspendedBy avatarFileId phone createdAt updatedAt"
        )
        .sort({ createdAt: -1 })
        .lean();

      const userIds = users.map((user) => user._id);

      const workerProfiles = await Worker.find({
        user: { $in: userIds },
      })
        .lean();

      const profileByUserId = new Map(
        workerProfiles.map((worker) => [
          String(worker.user),
          worker,
        ])
      );

      const workers = users.map((user) => ({
        ...user,
        workerProfile:
          profileByUserId.get(String(user._id)) || null,
      }));

      return res.status(200).json({
        success: true,
        count: workers.length,
        workers,
      });
    } catch (error) {
      console.error("Fetch admin workers error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to load workers.",
      });
    }
  },
);

/* =========================================================
   ADMIN - GET EMPLOYERS
   Admin Only
========================================================= */

app.get(
  "/api/admin/employers",
  authenticateUser,
  requireAdmin,
  async (req, res) => {
    try {
      const employers = await User.find({
        role: "employer",
      })
        .select(
          "name email emailVerified role accountStatus suspensionReason suspendedAt suspendedBy avatarFileId phone businessName location aboutBusiness createdAt updatedAt"
        )
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        count: employers.length,
        employers,
      });
    } catch (error) {
      console.error("Fetch admin employers error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to load employers.",
      });
    }
  },
);

/* =========================================================
   ADMIN - GET CONTACT MESSAGES
========================================================= */

app.get(
  "/api/admin/contact-messages",
  authenticateUser,
  requireAdmin,
  async (req, res) => {
    try {
      const messages = await ContactMessage.find().sort({
        createdAt: -1,
      });

      const counts = {
        total: messages.length,
        new: 0,
        read: 0,
        resolved: 0,
      };

      messages.forEach((message) => {
        if (message.status === "new") {
          counts.new += 1;
        }

        if (message.status === "read") {
          counts.read += 1;
        }

        if (message.status === "resolved") {
          counts.resolved += 1;
        }
      });

      return res.status(200).json({
        success: true,
        count: messages.length,
        counts,
        messages,
      });
    } catch (error) {
      console.error("Fetch admin contact messages error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to load contact messages.",
      });
    }
  },
);

/* =========================================================
   ADMIN - UPDATE CONTACT MESSAGE STATUS
========================================================= */

app.patch(
  "/api/admin/contact-messages/:id/status",
  authenticateUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid contact message ID.",
        });
      }

      const allowedStatuses = ["new", "read", "resolved"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be new, read or resolved.",
        });
      }

      const message = await ContactMessage.findById(id);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Contact message not found.",
        });
      }

      message.status = status;

      await message.save();

      return res.status(200).json({
        success: true,
        message: `Message marked as ${status}.`,
        contactMessage: message,
      });
    } catch (error) {
      console.error("Update contact message status error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update contact message.",
      });
    }
  },
);

/* =========================================================
   ADMIN - DELETE CONTACT MESSAGE
========================================================= */

app.delete(
  "/api/admin/contact-messages/:id",
  authenticateUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid contact message ID.",
        });
      }

      const message = await ContactMessage.findById(id);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Contact message not found.",
        });
      }

      await message.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Contact message deleted successfully.",
      });
    } catch (error) {
      console.error("Delete contact message error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to delete contact message.",
      });
    }
  },
);

/* =========================================================
   REGISTER USER
========================================================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid account details.",
      });
    }

    const cleanName = name.trim();
    const normalizedEmail = email.toLowerCase().trim();

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "Please enter your name.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const allowedRoles = ["worker", "employer"];
    const userRole = allowedRoles.includes(role) ? role : "worker";

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      if (existingUser.emailVerified) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this email already exists. Please login instead.",
          accountExists: true,
          email: existingUser.email,
        });
      }

      const retryAfter = getVerificationRetryAfterSeconds(existingUser);

      if (retryAfter > 0) {
        return res.status(429).json({
          success: false,
          message: `A verification email was sent recently. Please wait ${retryAfter} seconds before requesting another.`,
          verificationRequired: true,
          resendAvailable: true,
          retryAfter,
          email: existingUser.email,
          role: existingUser.role,
        });
      }

      const previousToken = existingUser.emailVerificationToken;
      const previousExpiry = existingUser.emailVerificationExpires;

      const { rawToken, tokenHash, expiresAt } =
        createEmailVerificationToken();

      existingUser.emailVerificationToken = tokenHash;
      existingUser.emailVerificationExpires = expiresAt;

      await existingUser.save();

      try {
        await sendVerificationEmail({
          user: existingUser,
          rawToken,
          isResend: true,
        });
      } catch (mailError) {
        console.error("Verification resend failed:", mailError);

        existingUser.emailVerificationToken = previousToken;
        existingUser.emailVerificationExpires = previousExpiry;

        await existingUser.save();

        return res.status(500).json({
          success: false,
          message:
            "Unable to send a new verification email right now. Please try again.",
          verificationRequired: true,
          resendAvailable: true,
          email: existingUser.email,
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Your account is waiting for email verification. We sent you a new verification link.",
        verificationRequired: true,
        verificationResent: true,
        resendAvailable: true,
        email: existingUser.email,
        role: existingUser.role,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rawToken, tokenHash, expiresAt } =
      createEmailVerificationToken();

    const user = await User.create({
      name: cleanName,
      email: normalizedEmail,
      password: hashedPassword,
      role: userRole,

      emailVerified: false,

      emailVerificationToken: tokenHash,

      emailVerificationExpires: expiresAt,
    });

    try {
      await sendVerificationEmail({
        user,
        rawToken,
        isResend: false,
      });
    } catch (mailError) {
      console.error("Verification email failed:", mailError);

      await User.deleteOne({
        _id: user._id,
      });

      return res.status(500).json({
        success: false,
        message:
          "Account could not be created because the verification email could not be sent. Please try again.",
      });
    }

    return res.status(201).json({
      success: true,

      message:
        "Account created successfully. Please check your email and verify your account before logging in.",

      verificationRequired: true,

      resendAvailable: true,

      email: user.email,

      role: user.role,
    });
  } catch (error) {
    console.error("Register user error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
        accountExists: true,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create account.",
    });
  }
});

/* =========================================================
   VERIFY EMAIL
========================================================= */

app.get("/api/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required.",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,

      emailVerificationExpires: {
        $gt: new Date(),
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,

        message: "Verification link is invalid or has expired.",
      });
    }

    user.emailVerified = true;

    user.emailVerificationToken = null;

    user.emailVerificationExpires = null;

    await user.save();
    if (user.role === "worker") {
      await refreshWorkerVerificationByUserId(
        user._id,
      );
    }


    return res.status(200).json({
      success: true,

      message: "Email verified successfully. You can now login to WorkMate.",

      email: user.email,

      role: user.role,
    });
  } catch (error) {
    console.error("Verify email error:", error);

    return res.status(500).json({
      success: false,

      message: "Unable to verify email right now. Please try again.",
    });
  }
});

/* =========================================================
   RESEND EMAIL VERIFICATION
   Public
========================================================= */

app.post("/api/auth/resend-verification", async (req, res) => {
  const genericMessage =
    "If this email is linked to an unverified WorkMate account, a new verification link has been sent.";

  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user || user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    const retryAfter = getVerificationRetryAfterSeconds(user);

    if (retryAfter > 0) {
      return res.status(429).json({
        success: false,
        message: `A verification email was sent recently. Please wait ${retryAfter} seconds before requesting another.`,
        verificationRequired: true,
        resendAvailable: true,
        retryAfter,
        email: user.email,
      });
    }

    const previousToken = user.emailVerificationToken;
    const previousExpiry = user.emailVerificationExpires;

    const { rawToken, tokenHash, expiresAt } =
      createEmailVerificationToken();

    user.emailVerificationToken = tokenHash;
    user.emailVerificationExpires = expiresAt;

    await user.save();

    try {
      await sendVerificationEmail({
        user,
        rawToken,
        isResend: true,
      });
    } catch (mailError) {
      console.error("Resend verification email error:", mailError);

      user.emailVerificationToken = previousToken;
      user.emailVerificationExpires = previousExpiry;

      await user.save();

      return res.status(500).json({
        success: false,
        message:
          "Unable to send a new verification email right now. Please try again.",
        verificationRequired: true,
        resendAvailable: true,
        email: user.email,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "A new verification email has been sent. Please check your inbox.",
      verificationRequired: true,
      verificationResent: true,
      resendAvailable: true,
      email: user.email,
    });
  } catch (error) {
    console.error("Resend verification error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to process the verification request right now. Please try again.",
    });
  }
});

/* =========================================================
   LOGIN USER
========================================================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,

        message: "Please verify your email before logging in.",

        verificationRequired: true,

        resendAvailable: true,

        email: user.email,
      });
    }

    if (
      user.role !== "admin" &&
      user.accountStatus === "suspended"
    ) {
      return res.status(403).json({
        success: false,
        accountSuspended: true,
        message:
          "Your WorkMate account has been suspended by an administrator.",
        reason:
          user.suspensionReason ||
          "Please contact WorkMate support for more information.",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to login.",
    });
  }
});

/* =========================================================
   CHANGE PASSWORD
   Logged-in User
========================================================= */

app.put("/api/auth/change-password", authenticateUser, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Current password, new password and confirm password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match.",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your current password.",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const currentPasswordMatch = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!currentPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedNewPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password right now. Please try again.",
    });
  }
});

/* =========================================================
   FORGOT PASSWORD
   Public
========================================================= */

app.post("/api/auth/forgot-password", async (req, res) => {
  const genericMessage =
    "If an account exists for this email, a password reset link has been sent.";

  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    await PasswordResetToken.deleteMany({
      user: user._id,
    });

    const rawResetToken = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawResetToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await PasswordResetToken.create({
      user: user._id,
      tokenHash,
      expiresAt,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const resetUrl = `${frontendUrl}/reset-password?token=${rawResetToken}`;

    try {
      await contactMailTransporter.sendMail({
        from: `"WorkMate" <${process.env.CONTACT_EMAIL_USER}>`,

        to: user.email,

        subject: "Reset your WorkMate password",

        text: `
Hi ${user.name},

We received a request to reset your WorkMate password.

Open the link below to choose a new password:

${resetUrl}

This password reset link will expire in 30 minutes.

If you did not request a password reset, you can ignore this email.

WorkMate
          `.trim(),

        html: `
            <div
              style="
                max-width: 600px;
                margin: 0 auto;
                padding: 32px;
                font-family: Arial, sans-serif;
                color: #2d211b;
              "
            >
              <h1
                style="
                  margin-bottom: 8px;
                  color: #f47a20;
                "
              >
                WorkMate
              </h1>

              <h2>
                Reset your password
              </h2>

              <p>
                Hi ${user.name},
              </p>

              <p>
                We received a request to reset
                your WorkMate password.
              </p>

              <p style="margin: 30px 0;">
                <a
                  href="${resetUrl}"
                  style="
                    display: inline-block;
                    padding: 14px 24px;
                    border-radius: 10px;
                    background: #f47a20;
                    color: #ffffff;
                    text-decoration: none;
                    font-weight: 700;
                  "
                >
                  Reset Password
                </a>
              </p>

              <p>
                This password reset link expires
                in <strong>30 minutes</strong>.
              </p>

              <p
                style="
                  margin-top: 28px;
                  font-size: 13px;
                  color: #7c6a60;
                "
              >
                If you did not request this,
                you can safely ignore this email.
              </p>

              <p
                style="
                  margin-top: 24px;
                  font-size: 12px;
                  color: #9a8a80;
                "
              >
                For your security, never share
                this password reset link with anyone.
              </p>
            </div>
          `,
      });
    } catch (mailError) {
      console.error("Password reset email error:", mailError);

      await PasswordResetToken.deleteMany({
        user: user._id,
      });

      return res.status(500).json({
        success: false,
        message:
          "Unable to send the password reset email right now. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process your password reset request right now.",
    });
  }
});

/* =========================================================
   RESET PASSWORD
   Public
========================================================= */

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Reset token and both password fields are required.",
      });
    }

    if (
      typeof token !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset request.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match.",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetRecord = await PasswordResetToken.findOne({
      tokenHash,

      expiresAt: {
        $gt: new Date(),
      },
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: "Password reset link is invalid or has expired.",
      });
    }

    const user = await User.findById(resetRecord.user);

    if (!user) {
      await PasswordResetToken.deleteMany({
        user: resetRecord.user,
      });

      return res.status(400).json({
        success: false,
        message: "Password reset link is invalid or has expired.",
      });
    }

    const samePassword = await bcrypt.compare(newPassword, user.password);

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message:
          "Please choose a password different from your current password.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    await PasswordResetToken.deleteMany({
      user: user._id,
    });

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset your password right now. Please try again.",
    });
  }
});

/* =========================================================
   DELETE ACCOUNT
   Worker / Employer
   Password Confirmation Required
========================================================= */

app.delete(
  "/api/auth/account",
  authenticateUser,
  async (req, res) => {
    try {
      const { password } = req.body;

      if (
        !password ||
        typeof password !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter your password to delete your account.",
        });
      }

      const user =
        await User.findById(
          req.user.userId,
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User account not found.",
        });
      }

      if (
        user.role === "admin"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Admin accounts cannot be deleted from this page.",
        });
      }

      const passwordMatch =
        await bcrypt.compare(
          password,
          user.password,
        );

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message:
            "Incorrect password. Account was not deleted.",
        });
      }

      const userId =
        user._id;

      /* =====================================================
         WORKER ACCOUNT CLEANUP
      ===================================================== */

      if (
        user.role === "worker"
      ) {
        const workerProfiles =
          await Worker.find({
            user: userId,
          }).select("_id");

        const workerProfileIds =
          workerProfiles.map(
            (worker) =>
              worker._id,
          );

        /*
         * Remove applications created
         * by this worker account.
         */

        await Application.deleteMany({
          worker: userId,
        });

        /*
         * Remove contact requests that
         * belong to this worker.
         */

        await ContactRequest.deleteMany({
          $or: [
            {
              workerUser:
                userId,
            },

            ...(workerProfileIds.length >
            0
              ? [
                  {
                    worker: {
                      $in:
                        workerProfileIds,
                    },
                  },
                ]
              : []),
          ],
        });

        /*
         * Finally remove worker profile.
         */

        await Worker.deleteMany({
          user: userId,
        });
      }

      /* =====================================================
         EMPLOYER ACCOUNT CLEANUP
      ===================================================== */

      if (
        user.role === "employer"
      ) {
        const employerJobs =
          await Job.find({
            employer:
              userId,
          }).select("_id");

        const jobIds =
          employerJobs.map(
            (job) => job._id,
          );

        /*
         * Remove applications belonging
         * to jobs posted by this employer.
         */

        if (
          jobIds.length > 0
        ) {
          await Application.deleteMany({
            job: {
              $in: jobIds,
            },
          });
        }

        /*
         * Remove employer jobs.
         */

        await Job.deleteMany({
          employer:
            userId,
        });

        /*
         * Remove worker-contact requests
         * sent by this employer.
         */

        await ContactRequest.deleteMany({
          employer:
            userId,
        });
      }

      /* =====================================================
         COMMON ACCOUNT CLEANUP
      ===================================================== */

      await PasswordResetToken.deleteMany({
        user: userId,
      });

      await User.deleteOne({
        _id: userId,
      });

      return res.status(200).json({
        success: true,

        message:
          "Your WorkMate account has been permanently deleted.",
      });
    } catch (error) {
      console.error(
        "Delete account error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to delete your account right now. Please try again.",
      });
    }
  },
);

/* =========================================================
   UPDATE EMPLOYER PROFILE
   Employer Only
========================================================= */

app.put("/api/employer/profile", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employer accounts can update employer profiles.",
      });
    }

    const { name, phone, businessName, location, aboutBusiness } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required.",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employer account not found.",
      });
    }

    user.name = name.trim();

    user.phone = typeof phone === "string" ? phone.trim() : "";

    user.businessName =
      typeof businessName === "string" ? businessName.trim() : "";

    user.location = typeof location === "string" ? location.trim() : "";

    user.aboutBusiness =
      typeof aboutBusiness === "string" ? aboutBusiness.trim() : "";

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Employer profile updated successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Update employer profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update employer profile.",
    });
  }
});

/* =========================================================
   DELETE EMPLOYER ACCOUNT
   Employer Only
========================================================= */

app.delete("/api/employer/account", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employer accounts can delete employer accounts.",
      });
    }

    const employerId = req.user.userId;

    const user = await User.findById(employerId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employer account not found.",
      });
    }

    const employerJobs = await Job.find({
      employer: employerId,
    }).select("_id");

    const jobIds = employerJobs.map((job) => job._id);

    if (jobIds.length > 0) {
      await Application.deleteMany({
        job: {
          $in: jobIds,
        },
      });
    }

    await Job.deleteMany({
      employer: employerId,
    });

    await ContactRequest.deleteMany({
      employer: employerId,
    });

    await User.deleteOne({
      _id: employerId,
    });

    return res.status(200).json({
      success: true,
      message: "Employer account deleted successfully.",
    });
  } catch (error) {
    console.error("Delete employer account error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete employer account.",
    });
  }
});

/* =========================================================
   CONTACT WORKER
   Employer Only
========================================================= */

app.post("/api/contact-worker", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employer accounts can contact workers.",
      });
    }

    const {
      workerId,
      workerName,
      name,
      phone,
      workLocation,
      message,
      jobId,
    } = req.body;

    if (
      !workerId ||
      !workerName ||
      !name ||
      !phone ||
      !workLocation ||
      !message
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID.",
      });
    }

    let selectedJob = null;

    if (jobId) {
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid job ID.",
        });
      }

      selectedJob = await Job.findOne({
        _id: jobId,
        employer: req.user.userId,
      });

      if (!selectedJob) {
        return res.status(404).json({
          success: false,
          message: "Selected job was not found in your job posts.",
        });
      }

      if (selectedJob.status !== "open") {
        return res.status(409).json({
          success: false,
          message: "Only open jobs can be linked to a new worker request.",
        });
      }
    }

    const worker = await Worker.findById(workerId);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found.",
      });
    }

    if (!worker.user) {
      return res.status(400).json({
        success: false,
        message: "This worker profile is not linked to a user account.",
      });
    }

    const existingRequest = await ContactRequest.findOne({
      employer: req.user.userId,
      worker: worker._id,
      status: {
        $in: ["pending", "accepted"],
      },
    }).sort({
      createdAt: -1,
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message:
          existingRequest.status === "accepted"
            ? "This worker has already accepted your request."
            : "You already have a pending request for this worker.",
        request: existingRequest,
      });
    }

    const contactRequest = await ContactRequest.create({
      worker: worker._id,
      workerUser: worker.user,
      employer: req.user.userId,
      job: selectedJob?._id || null,
      employerName: name.trim(),
      phone: phone.trim(),

      workLocation: workLocation.trim(),

      message: message.trim(),
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: `Your request has been sent to ${workerName}.`,
      request: contactRequest,
    });
  } catch (error) {
    console.error("Contact worker error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to send contact request.",
    });
  }
});

/* =========================================================
   GET MY CONTACT REQUEST STATUS FOR WORKER
   Employer Only
========================================================= */

app.get(
  "/api/contact-requests/worker/:workerId/status",
  authenticateUser,
  async (req, res) => {
    try {
      if (req.user.role !== "employer") {
        return res.status(403).json({
          success: false,
          message: "Only employers can check contact request status.",
        });
      }

      const { workerId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(workerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid worker ID.",
        });
      }

      const request = await ContactRequest.findOne({
        employer: req.user.userId,
        worker: workerId,
        status: {
          $in: ["pending", "accepted"],
        },
      }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        request: request || null,
        status: request?.status || null,
      });
    } catch (error) {
      console.error("Fetch worker request status error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to check request status.",
      });
    }
  },
);

/* =========================================================
   EDIT SENT CONTACT REQUEST
   Employer Only - Pending Only
========================================================= */

app.patch("/api/contact-requests/:id", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can edit sent requests.",
      });
    }

    const { id } = req.params;
    const { phone, workLocation, message, jobId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contact request ID.",
      });
    }

    if (!phone || !workLocation || !message) {
      return res.status(400).json({
        success: false,
        message: "Phone, work location and message are required.",
      });
    }

    const request = await ContactRequest.findOne({
      _id: id,
      employer: req.user.userId,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Contact request not found.",
      });
    }

    if (request.status !== "pending") {
      return res.status(409).json({
        success: false,
        message: "Only pending requests can be edited.",
      });
    }

    let selectedJob = null;

    if (jobId) {
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid job ID.",
        });
      }

      selectedJob = await Job.findOne({
        _id: jobId,
        employer: req.user.userId,
      });

      if (!selectedJob) {
        return res.status(404).json({
          success: false,
          message: "Selected job was not found in your job posts.",
        });
      }

      if (selectedJob.status !== "open") {
        return res.status(409).json({
          success: false,
          message: "Only open jobs can be linked to a pending request.",
        });
      }
    }

    request.phone = phone.trim();
    request.workLocation = workLocation.trim();
    request.message = message.trim();
    request.job = selectedJob?._id || null;

    await request.save();

    await request.populate(
      "job",
      "title skill location salary jobType status",
    );

    res.status(200).json({
      success: true,
      message: "Request updated successfully.",
      request,
    });
  } catch (error) {
    console.error("Edit contact request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update contact request.",
    });
  }
});

/* =========================================================
   CANCEL SENT CONTACT REQUEST
   Employer Only - Pending Only
========================================================= */

app.delete("/api/contact-requests/:id", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can cancel sent requests.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contact request ID.",
      });
    }

    const request = await ContactRequest.findOne({
      _id: id,
      employer: req.user.userId,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Contact request not found.",
      });
    }

    if (request.status !== "pending") {
      return res.status(409).json({
        success: false,
        message: "Only pending requests can be cancelled.",
      });
    }

    await request.deleteOne();

    res.status(200).json({
      success: true,
      message: "Request cancelled successfully.",
    });
  } catch (error) {
    console.error("Cancel contact request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel contact request.",
    });
  }
});

/* =========================================================
   GET MY SENT CONTACT REQUESTS
   Employer Only
========================================================= */

app.get("/api/contact-requests/sent", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can view sent requests.",
      });
    }

    const requests = await ContactRequest.find({
      employer: req.user.userId,
    })
      .populate(
        "worker",
        "name role location phone emoji avatarFileId",
      )
      .populate(
        "workerUser",
        "name email",
      )
      .populate(
        "job",
        "title skill location salary jobType status",
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Fetch sent requests error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch sent requests.",
    });
  }
});

/* =========================================================
   GET MY RECEIVED CONTACT REQUESTS
   Worker Only
========================================================= */

app.get("/api/contact-requests/my", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can view received requests.",
      });
    }

    const requests = await ContactRequest.find({
      workerUser: req.user.userId,
    })
      .populate("employer", "name email avatarFileId")
      .populate("worker", "name role location avatarFileId")
      .populate(
        "job",
        "title skill location salary jobType status",
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Fetch contact requests error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch contact requests.",
    });
  }
});

/* =========================================================
   UPDATE CONTACT REQUEST STATUS
   Worker Only
========================================================= */

app.patch(
  "/api/contact-requests/:id/status",
  authenticateUser,
  async (req, res) => {
    try {
      if (req.user.role !== "worker") {
        return res.status(403).json({
          success: false,
          message: "Only workers can update request status.",
        });
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid contact request ID.",
        });
      }

      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be accepted or rejected.",
        });
      }

      const request = await ContactRequest.findOne({
        _id: id,
        workerUser: req.user.userId,
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Contact request not found.",
        });
      }

      if (request.status !== "pending") {
        return res.status(409).json({
          success: false,
          message: "This request has already been answered and is now locked.",
        });
      }

      const updatedRequest =
        await ContactRequest.findByIdAndUpdate(
          request._id,
          {
            $set: {
              status,
            },
          },
          {
            new: true,
          },
        );

      res.status(200).json({
        success: true,
        message: `Request ${status} successfully.`,
        request: updatedRequest,
      });
    } catch (error) {
      console.error("Update contact request error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to update contact request.",
      });
    }
  },
);

/* =========================================================
   REGISTER WORKER
   Worker Only
========================================================= */

app.post("/api/workers", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only worker accounts can create worker profiles.",
      });
    }

    const existingProfile = await Worker.findOne({
      user: req.user.userId,
    });

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: "You already have a worker profile.",
        worker: existingProfile,
      });
    }

    const {
      name,
      phone,
      role,
      skills,
      location,
      experience,
      availability,
      description,
      salary,
      emoji,
    } = req.body;

    if (
      !name ||
      !phone ||
      !role ||
      !Array.isArray(skills) ||
      skills.length === 0 ||
      !location ||
      !experience ||
      !availability ||
      salary === undefined ||
      salary === null ||
      salary === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are required.",
      });
    }

    const allowedAvailability = ["full-time", "part-time", "both"];

    if (!allowedAvailability.includes(availability)) {
      return res.status(400).json({
        success: false,
        message: "Invalid availability value.",
      });
    }

    const numericSalary = Number(salary);

    if (Number.isNaN(numericSalary) || numericSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid salary.",
      });
    }

    const accountUser = await User.findById(req.user.userId);

    const worker = await Worker.create({
      user: req.user.userId,

      avatarFileId: accountUser?.avatarFileId || null,

      name: name.trim(),

      phone: phone.trim(),

      role: role.trim(),

      skills,

      location: location.trim(),

      experience,

      availability,

      description: description?.trim() || "",

      salary: numericSalary,

      emoji: emoji || "👨‍🍳",

      verified: isWorkerProfileComplete(
        {
          name: name.trim(),
          phone: phone.trim(),
          role: role.trim(),
          skills,
          location: location.trim(),
          experience,
          availability,
          description: description?.trim() || "",
          salary: numericSalary,
        },
        accountUser,
      ),
    });

    res.status(201).json({
      success: true,
      message: "Worker registered successfully!",
      worker,
    });
  } catch (error) {
    console.error("Worker registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A worker profile already exists for this account.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to register worker.",
    });
  }
});


/* =========================================================
   GET CURRENT WORKER PROFILE
   Worker Only
========================================================= */

app.get("/api/workers/me", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only worker accounts can access a worker profile.",
      });
    }

    const worker = await Worker.findOne({
      user: req.user.userId,
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found.",
      });
    }

    res.status(200).json({
      success: true,
      worker,
    });
  } catch (error) {
    console.error("Fetch current worker profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch worker profile.",
    });
  }
});

/* =========================================================
   GET MY SAVED WORKERS
   Employer Only
========================================================= */

app.get("/api/saved-workers", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can view saved workers.",
      });
    }

    const savedWorkers = await SavedWorker.find({
      employer: req.user.userId,
    })
      .populate("worker")
      .sort({ createdAt: -1 });

    const workers = savedWorkers
      .map((savedWorker) => savedWorker.worker)
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      count: workers.length,
      workers,
    });
  } catch (error) {
    console.error("Fetch saved workers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch saved workers.",
    });
  }
});

/* =========================================================
   GET WORKER SAVED STATUS
   Employer Only
========================================================= */

app.get(
  "/api/workers/:id/saved-status",
  authenticateUser,
  async (req, res) => {
    try {
      if (req.user.role !== "employer") {
        return res.status(403).json({
          success: false,
          message: "Only employers can check saved workers.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid worker ID.",
        });
      }

      const worker = await Worker.findById(req.params.id)
        .select("_id")
        .lean();

      if (!worker) {
        return res.status(404).json({
          success: false,
          message: "Worker not found.",
        });
      }

      const savedWorker = await SavedWorker.findOne({
        employer: req.user.userId,
        worker: worker._id,
      })
        .select("_id")
        .lean();

      return res.status(200).json({
        success: true,
        saved: Boolean(savedWorker),
      });
    } catch (error) {
      console.error("Check saved worker status error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to check saved worker status.",
      });
    }
  },
);

/* =========================================================
   SAVE WORKER
   Employer Only
========================================================= */

app.post(
  "/api/workers/:id/save",
  authenticateUser,
  async (req, res) => {
    try {
      if (req.user.role !== "employer") {
        return res.status(403).json({
          success: false,
          message: "Only employers can save workers.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid worker ID.",
        });
      }

      const worker = await Worker.findById(req.params.id)
        .select("_id")
        .lean();

      if (!worker) {
        return res.status(404).json({
          success: false,
          message: "Worker not found.",
        });
      }

      await SavedWorker.findOneAndUpdate(
        {
          employer: req.user.userId,
          worker: worker._id,
        },
        {
          $setOnInsert: {
            employer: req.user.userId,
            worker: worker._id,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      return res.status(200).json({
        success: true,
        saved: true,
        message: "Worker saved successfully.",
      });
    } catch (error) {
      console.error("Save worker error:", error);

      if (error?.code === 11000) {
        return res.status(200).json({
          success: true,
          saved: true,
          message: "Worker is already saved.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to save worker.",
      });
    }
  },
);

/* =========================================================
   UNSAVE WORKER
   Employer Only
========================================================= */

app.delete(
  "/api/workers/:id/save",
  authenticateUser,
  async (req, res) => {
    try {
      if (req.user.role !== "employer") {
        return res.status(403).json({
          success: false,
          message: "Only employers can remove saved workers.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid worker ID.",
        });
      }

      await SavedWorker.deleteOne({
        employer: req.user.userId,
        worker: req.params.id,
      });

      return res.status(200).json({
        success: true,
        saved: false,
        message: "Worker removed from saved workers.",
      });
    } catch (error) {
      console.error("Unsave worker error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to remove saved worker.",
      });
    }
  },
);

/* =========================================================
   GET ALL WORKERS
   Public
========================================================= */

app.get("/api/workers", async (req, res) => {
  try {
    const workers = await Worker.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: workers.length,
      workers,
    });
  } catch (error) {
    console.error("Fetch workers error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch workers.",
    });
  }
});

/* =========================================================
   REVIEW HELPERS
========================================================= */

async function recalculateWorkerRating(workerId) {
  const summary = await Review.aggregate([
    {
      $match: {
        worker: new mongoose.Types.ObjectId(workerId),
      },
    },
    {
      $group: {
        _id: "$worker",
        averageRating: {
          $avg: "$rating",
        },
        reviewCount: {
          $sum: 1,
        },
      },
    },
  ]);

  const averageRating =
    summary.length > 0
      ? Number(summary[0].averageRating.toFixed(1))
      : 0;

  await Worker.findByIdAndUpdate(workerId, {
    rating: averageRating,
  });

  return {
    rating: averageRating,
    reviewCount:
      summary.length > 0
        ? summary[0].reviewCount
        : 0,
  };
}

/* =========================================================
   GET WORKER REVIEWS
   Public
========================================================= */

app.get("/api/workers/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID.",
      });
    }

    const worker = await Worker.findById(id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found.",
      });
    }

    const reviews = await Review.find({
      worker: id,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      rating: worker.rating || 0,
      reviews,
    });
  } catch (error) {
    console.error("Fetch worker reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews.",
    });
  }
});

/* =========================================================
   REVIEW ELIGIBILITY
   Employer Only
========================================================= */

app.get(
  "/api/workers/:id/reviews/eligibility",
  authenticateUser,
  async (req, res) => {
    try {
      if (req.user.role !== "employer") {
        return res.status(403).json({
          success: false,
          message: "Only employers can review workers.",
        });
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid worker ID.",
        });
      }

      const worker = await Worker.findById(id);

      if (!worker) {
        return res.status(404).json({
          success: false,
          message: "Worker not found.",
        });
      }

      const acceptedRequest = await ContactRequest.findOne({
        employer: req.user.userId,
        worker: id,
        status: "accepted",
      });

      const existingReview = await Review.findOne({
        employer: req.user.userId,
        worker: id,
      });

      return res.status(200).json({
        success: true,
        eligible: Boolean(acceptedRequest),
        existingReview: existingReview || null,
      });
    } catch (error) {
      console.error("Review eligibility error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to check review eligibility.",
      });
    }
  },
);

/* =========================================================
   CREATE OR UPDATE REVIEW
   Employer Only
========================================================= */

app.put(
  "/api/workers/:id/review",
  authenticateUser,
  async (req, res) => {
    try {
      if (req.user.role !== "employer") {
        return res.status(403).json({
          success: false,
          message: "Only employers can review workers.",
        });
      }

      const { id } = req.params;
      const { rating, comment } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid worker ID.",
        });
      }

      const numericRating = Number(rating);
      const cleanComment =
        typeof comment === "string"
          ? comment.trim()
          : "";

      if (
        !Number.isInteger(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5.",
        });
      }

      if (
        cleanComment.length < 3 ||
        cleanComment.length > 500
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Review must be between 3 and 500 characters.",
        });
      }

      const worker = await Worker.findById(id);

      if (!worker) {
        return res.status(404).json({
          success: false,
          message: "Worker not found.",
        });
      }

      const acceptedRequest = await ContactRequest.findOne({
        employer: req.user.userId,
        worker: id,
        status: "accepted",
      });

      if (!acceptedRequest) {
        return res.status(403).json({
          success: false,
          message:
            "You can review this worker only after an accepted contact request.",
        });
      }

      const employer = await User.findById(req.user.userId);

      if (!employer) {
        return res.status(404).json({
          success: false,
          message: "Employer account not found.",
        });
      }

      const review = await Review.findOneAndUpdate(
        {
          employer: req.user.userId,
          worker: id,
        },
        {
          employer: req.user.userId,
          worker: id,
          employerName: employer.name,
          rating: numericRating,
          comment: cleanComment,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );

      const ratingSummary =
        await recalculateWorkerRating(id);

      return res.status(200).json({
        success: true,
        message: "Review saved successfully.",
        review,
        rating: ratingSummary.rating,
        reviewCount: ratingSummary.reviewCount,
      });
    } catch (error) {
      console.error("Save review error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to save review.",
      });
    }
  },
);

/* =========================================================
   DELETE REVIEW
   Employer Only - Own Review
========================================================= */

app.delete(
  "/api/workers/:id/review",
  authenticateUser,
  async (req, res) => {
    try {
      if (req.user.role !== "employer") {
        return res.status(403).json({
          success: false,
          message: "Only employers can delete reviews.",
        });
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid worker ID.",
        });
      }

      const review = await Review.findOneAndDelete({
        employer: req.user.userId,
        worker: id,
      });

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found.",
        });
      }

      const ratingSummary =
        await recalculateWorkerRating(id);

      return res.status(200).json({
        success: true,
        message: "Review deleted successfully.",
        rating: ratingSummary.rating,
        reviewCount: ratingSummary.reviewCount,
      });
    } catch (error) {
      console.error("Delete review error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete review.",
      });
    }
  },
);

/* =========================================================
   GET SINGLE WORKER
   Public
========================================================= */

app.get("/api/workers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID.",
      });
    }

    const worker = await Worker.findById(id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found.",
      });
    }

    res.status(200).json({
      success: true,
      worker,
    });
  } catch (error) {
    console.error("Fetch worker error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch worker.",
    });
  }
});

/* =========================================================
   UPDATE WORKER
   Owner Only
========================================================= */

app.put("/api/workers/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID.",
      });
    }

    const existingWorker = await Worker.findById(id);

    if (!existingWorker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found.",
      });
    }

    if (!existingWorker.user) {
      return res.status(403).json({
        success: false,
        message: "This older worker profile is not linked to an account.",
      });
    }

    if (existingWorker.user.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own worker profile.",
      });
    }

    const {
      name,
      phone,
      role,
      skills,
      location,
      experience,
      availability,
      description,
      salary,
      emoji,
    } = req.body;

    if (
      !name ||
      !phone ||
      !role ||
      !Array.isArray(skills) ||
      skills.length === 0 ||
      !location ||
      !experience ||
      !availability ||
      salary === undefined ||
      salary === null ||
      salary === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are required.",
      });
    }

    const allowedAvailability = ["full-time", "part-time", "both"];

    if (!allowedAvailability.includes(availability)) {
      return res.status(400).json({
        success: false,
        message: "Invalid availability value.",
      });
    }

    const numericSalary = Number(salary);

    if (Number.isNaN(numericSalary) || numericSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid salary.",
      });
    }

    existingWorker.name = name.trim();

    existingWorker.phone = phone.trim();

    existingWorker.role = role.trim();

    existingWorker.skills = skills;

    existingWorker.location = location.trim();

    existingWorker.experience = experience;

    existingWorker.availability = availability;

    existingWorker.description = description?.trim() || "";

    existingWorker.salary = numericSalary;

    if (emoji) {
      existingWorker.emoji = emoji;
    }

    const accountUser = await User.findById(
      req.user.userId,
    );

    existingWorker.verified =
      isWorkerProfileComplete(
        existingWorker,
        accountUser,
      );

    const updatedWorker = await existingWorker.save();

    res.status(200).json({
      success: true,
      message: "Worker profile updated successfully!",
      worker: updatedWorker,
    });
  } catch (error) {
    console.error("Update worker error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update worker profile.",
    });
  }
});

/* =========================================================
   DELETE WORKER
   Owner Only
========================================================= */

app.delete("/api/workers/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID.",
      });
    }

    const worker = await Worker.findById(id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found.",
      });
    }

    if (!worker.user) {
      return res.status(403).json({
        success: false,
        message: "This older worker profile is not linked to an account.",
      });
    }

    if (worker.user.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own worker profile.",
      });
    }

    await worker.deleteOne();

    res.status(200).json({
      success: true,
      message: "Worker profile deleted successfully.",
    });
  } catch (error) {
    console.error("Delete worker error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete worker profile.",
    });
  }
});

/* =========================================================
   CREATE JOB
   Employer Only
========================================================= */

app.post("/api/jobs", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employer accounts can post jobs.",
      });
    }

    const { title, skill, location, salary, jobType, description } = req.body;

    if (
      !title ||
      !skill ||
      !location ||
      salary === undefined ||
      salary === null ||
      salary === "" ||
      !jobType
    ) {
      return res.status(400).json({
        success: false,
        message: "All required job fields are required.",
      });
    }

    const numericSalary = Number(salary);

    if (Number.isNaN(numericSalary) || numericSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid salary.",
      });
    }

    const allowedTypes = ["full-time", "part-time", "both"];

    if (!allowedTypes.includes(jobType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job type.",
      });
    }

    const job = await Job.create({
      employer: req.user.userId,

      title: title.trim(),

      skill: skill.trim(),

      location: location.trim(),

      salary: numericSalary,

      jobType,

      description: description?.trim() || "",
    });

    res.status(201).json({
      success: true,
      message: "Job posted successfully!",
      job,
    });
  } catch (error) {
    console.error("Create job error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to post job.",
    });
  }
});

/* =========================================================
   GET ALL JOBS
   Public
========================================================= */

app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await Job.find({
      status: "open",
    })
      .populate("employer", "name email avatarFileId businessName location")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Fetch jobs error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch jobs.",
    });
  }
});

/* =========================================================
   GET MY JOBS
   Employer Only
========================================================= */

app.get("/api/jobs/my", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can view their job posts.",
      });
    }

    const jobs = await Job.find({
      employer: req.user.userId,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Fetch employer jobs error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch your job posts.",
    });
  }
});

/* =========================================================
   GET JOB APPLICATIONS
   Employer Owner Only
========================================================= */

app.get("/api/jobs/:id/applications", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({
        success: false,
        message: "Only employers can view job applicants.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    if (job.employer.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view applicants for your own jobs.",
      });
    }

    const applications = await Application.find({
      job: id,
    })
      .populate("worker", "name email avatarFileId")
      .populate(
        "workerProfile",
        "name phone role skills location experience availability salary emoji rating avatarFileId",
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      job,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Fetch job applications error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch job applicants.",
    });
  }
});

/* =========================================================
   GET SINGLE JOB
   Public
========================================================= */

app.get("/api/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const job = await Job.findById(id).populate(
      "employer",
      "name email avatarFileId",
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("Fetch job error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch job.",
    });
  }
});

/* =========================================================
   UPDATE JOB
   Employer Owner Only
========================================================= */

app.put("/api/jobs/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    if (job.employer.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own job posts.",
      });
    }

    const { title, skill, location, salary, jobType, description, status } =
      req.body;

    const numericSalary = Number(salary);

    const allowedTypes = ["full-time", "part-time", "both"];

    if (
      !title ||
      !skill ||
      !location ||
      !allowedTypes.includes(jobType) ||
      Number.isNaN(numericSalary) ||
      numericSalary < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid job details.",
      });
    }

    job.title = title.trim();

    job.skill = skill.trim();

    job.location = location.trim();

    job.salary = numericSalary;

    job.jobType = jobType;

    job.description = description?.trim() || "";

    if (status === "open" || status === "closed") {
      job.status = status;
    }

    const updatedJob = await job.save();

    res.status(200).json({
      success: true,
      message: "Job updated successfully!",
      job: updatedJob,
    });
  } catch (error) {
    console.error("Update job error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update job.",
    });
  }
});

/* =========================================================
   DELETE JOB
   Employer Owner Only
   Also removes applications for that job
========================================================= */

app.delete("/api/jobs/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    if (job.employer.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own job posts.",
      });
    }

    const deletedApplications = await Application.deleteMany({
      job: id,
    });

    await job.deleteOne();

    res.status(200).json({
      success: true,
      message: "Job deleted successfully.",
      deletedApplications: deletedApplications.deletedCount,
    });
  } catch (error) {
    console.error("Delete job error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete job.",
    });
  }
});

/* =========================================================
   APPLY FOR JOB
   Worker Only
========================================================= */

app.post("/api/jobs/:id/apply", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only worker accounts can apply for jobs.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    if (job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "This job is no longer accepting applications.",
      });
    }

    const workerProfile = await Worker.findOne({
      user: req.user.userId,
    });

    if (!workerProfile) {
      return res.status(400).json({
        success: false,
        message: "Please create your worker profile before applying.",
      });
    }

    const existingApplication = await Application.findOne({
      job: id,
      worker: req.user.userId,
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this job.",
      });
    }

    const application = await Application.create({
      job: id,

      worker: req.user.userId,

      workerProfile: workerProfile._id,
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully!",
      application,
    });
  } catch (error) {
    console.error("Apply job error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this job.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to submit application.",
    });
  }
});

/* =========================================================
   UPDATE JOB APPLICATION STATUS
   Employer Owner Only
========================================================= */

app.patch(
  "/api/applications/:id/status",
  authenticateUser,
  async (req, res) => {
    try {
      if (req.user.role !== "employer") {
        return res.status(403).json({
          success: false,
          message: "Only employers can update application status.",
        });
      }

      const { id } = req.params;

      const { status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid application ID.",
        });
      }

      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be accepted or rejected.",
        });
      }

      const application = await Application.findById(id).populate("job");

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found.",
        });
      }

      if (!application.job) {
        return res.status(404).json({
          success: false,
          message: "The job for this application no longer exists.",
        });
      }

      if (application.job.employer.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only manage applications for your own jobs.",
        });
      }

      application.status = status;

      await application.save();

      res.status(200).json({
        success: true,
        message: `Application ${status} successfully.`,
        application,
      });
    } catch (error) {
      console.error("Update application status error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to update application status.",
      });
    }
  },
);

/* =========================================================
   GET MY APPLICATIONS
   Worker Only
========================================================= */

app.get("/api/applications/my", authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can view their applications.",
      });
    }

    const applications = await Application.find({
      worker: req.user.userId,
    })
      .populate({
        path: "job",

        select: "title skill location salary jobType status employer",

        populate: {
          path: "employer",

          model: "User",

          select: "name email avatarFileId",
        },
      })
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Fetch applications error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch applications.",
    });
  }
});

/* =========================================================
   START SERVER
========================================================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});