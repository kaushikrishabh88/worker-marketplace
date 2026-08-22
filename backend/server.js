const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const ContactRequest = require("./models/ContactRequest");
const Worker = require("./models/Worker");
const User = require("./models/User");
const Job = require("./models/Job");
const Application = require("./models/Application");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { registerAvatarRoutes, publicUser } = require("./avatarRoutes");

require("dotenv").config();

const app = express();

/* =========================================================
   Middleware
========================================================= */

app.use(cors());
app.use(express.json());

/* =========================================================
   Authentication Middleware
========================================================= */

function authenticateUser(req, res, next) {
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
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

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    const allowedRoles = ["worker", "employer"];

    const userRole = allowedRoles.includes(role) ? role : "worker";

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: userRole,
    });

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

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Register user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create account.",
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

    res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to login.",
    });
  }
});

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

   Deletes:
   - applications for employer jobs
   - employer jobs
   - employer contact requests
   - employer user account
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

    const { workerId, workerName, name, phone, workLocation, message } =
      req.body;

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
    const { phone, workLocation, message } = req.body;

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

    request.phone = phone.trim();
    request.workLocation = workLocation.trim();
    request.message = message.trim();

    await request.save();

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
      .populate("worker", "name role location phone emoji avatarFileId")
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

      request.status = status;

      await request.save();

      res.status(200).json({
        success: true,
        message: `Request ${status} successfully.`,
        request,
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
