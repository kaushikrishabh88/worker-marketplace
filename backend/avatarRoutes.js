const mongoose = require("mongoose");
const multer = require("multer");
const { Readable } = require("stream");

/* =========================================================
   MULTER CONFIG
========================================================= */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 1024 * 1024,
  },

  fileFilter: (
    req,
    file,
    callback
  ) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.mimetype
      )
    ) {
      return callback(
        new Error(
          "Only JPG, PNG and WebP images are allowed."
        )
      );
    }

    callback(null, true);
  },
});

/* =========================================================
   GRIDFS BUCKET
========================================================= */

function getBucket() {
  if (!mongoose.connection.db) {
    throw new Error(
      "MongoDB is not connected."
    );
  }

  return new mongoose.mongo.GridFSBucket(
    mongoose.connection.db,
    {
      bucketName:
        "profileImages",
    }
  );
}

/* =========================================================
   DELETE GRIDFS FILE
========================================================= */

async function deleteFile(fileId) {
  if (!fileId) {
    return;
  }

  try {
    const objectId =
      fileId instanceof
      mongoose.Types.ObjectId
        ? fileId
        : new mongoose.Types.ObjectId(
            fileId
          );

    await getBucket().delete(
      objectId
    );
  } catch (error) {
    console.error(
      "Delete avatar file error:",
      error.message
    );
  }
}

/* =========================================================
   PUBLIC USER DATA
========================================================= */

function publicUser(user) {
  return {
    id: user._id,

    name: user.name,

    email: user.email,

    role: user.role,

    phone:
      user.phone || "",

    businessName:
      user.businessName || "",

    location:
      user.location || "",

    aboutBusiness:
      user.aboutBusiness || "",

    avatarFileId:
      user.avatarFileId || null,

    avatarUrl:
      user.avatarFileId
        ? `/api/avatars/${user.avatarFileId}`
        : null,
  };
}

/* =========================================================
   REGISTER AVATAR ROUTES
========================================================= */

function registerAvatarRoutes({
  app,
  authenticateUser,
  User,
  Worker,
}) {
  /* =======================================================
     GET PROFILE IMAGE
     PUBLIC
  ======================================================= */

  app.get(
    "/api/avatars/:id",
    async (req, res) => {
      try {
        const { id } =
          req.params;

        if (
          !mongoose.Types.ObjectId.isValid(
            id
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid avatar ID.",
            });
        }

        const fileId =
          new mongoose.Types.ObjectId(
            id
          );

        const bucket =
          getBucket();

        const files =
          await bucket
            .find({
              _id: fileId,
            })
            .toArray();

        if (
          files.length === 0
        ) {
          return res
            .status(404)
            .json({
              success: false,

              message:
                "Profile image not found.",
            });
        }

        const file =
          files[0];

        res.set(
          "Content-Type",
          file.contentType ||
            "application/octet-stream"
        );

        res.set(
          "Cache-Control",
          "public, max-age=86400"
        );

        const downloadStream =
          bucket.openDownloadStream(
            fileId
          );

        downloadStream.on(
          "error",
          (error) => {
            console.error(
              "Avatar stream error:",
              error
            );

            if (
              !res.headersSent
            ) {
              res
                .status(404)
                .json({
                  success:
                    false,

                  message:
                    "Profile image not found.",
                });
            } else {
              res.end();
            }
          }
        );

        downloadStream.pipe(
          res
        );
      } catch (error) {
        console.error(
          "Get avatar error:",
          error
        );

        res
          .status(500)
          .json({
            success: false,

            message:
              "Failed to load profile image.",
          });
      }
    }
  );

  /* =======================================================
     UPLOAD / REPLACE PROFILE IMAGE
  ======================================================= */

  app.post(
    "/api/profile/avatar",

    authenticateUser,

    (
      req,
      res,
      next
    ) => {
      upload.single(
        "avatar"
      )(
        req,
        res,
        (error) => {
          if (!error) {
            return next();
          }

          if (
            error instanceof
            multer.MulterError
          ) {
            if (
              error.code ===
              "LIMIT_FILE_SIZE"
            ) {
              return res
                .status(400)
                .json({
                  success:
                    false,

                  message:
                    "Profile image must be 1 MB or smaller.",
                });
            }

            return res
              .status(400)
              .json({
                success:
                  false,

                message:
                  "Unable to upload profile image.",
              });
          }

          return res
            .status(400)
            .json({
              success: false,

              message:
                error.message ||
                "Invalid profile image.",
            });
        }
      );
    },

    async (req, res) => {
      let newFileId =
        null;

      try {
        if (!req.file) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Please choose a profile image.",
            });
        }

        const user =
          await User.findById(
            req.user.userId
          );

        if (!user) {
          return res
            .status(404)
            .json({
              success: false,

              message:
                "User account not found.",
            });
        }

        const oldFileId =
          user.avatarFileId ||
          null;

        const bucket =
          getBucket();

        const uploadStream =
          bucket.openUploadStream(
            `avatar-${user._id}-${Date.now()}`,
            {
              contentType:
                req.file.mimetype,

              metadata: {
                userId:
                  user._id.toString(),

                originalName:
                  req.file
                    .originalname,
              },
            }
          );

        newFileId =
          uploadStream.id;

        await new Promise(
          (
            resolve,
            reject
          ) => {
            Readable.from(
              req.file.buffer
            )
              .pipe(
                uploadStream
              )
              .on(
                "error",
                reject
              )
              .on(
                "finish",
                resolve
              );
          }
        );

        user.avatarFileId =
  newFileId;

await user.save();

const savedUser =
  await User.findById(
    user._id
  );

console.log(
  "AVATAR SAVED CHECK:",
  {
    userId:
      savedUser?._id?.toString(),

    role:
      savedUser?.role,

    avatarFileId:
      savedUser?.avatarFileId?.toString() ||
      null,
  }
);

if (
  user.role ===
  "worker"
) {
          await Worker.findOneAndUpdate(
            {
              user:
                user._id,
            },

            {
              avatarFileId:
                newFileId,
            }
          );
        }

        if (
          oldFileId &&
          oldFileId.toString() !==
            newFileId.toString()
        ) {
          await deleteFile(
            oldFileId
          );
        }

        return res
          .status(200)
          .json({
            success: true,

            message:
              "Profile photo updated successfully!",

            avatarFileId:
              newFileId,

            avatarUrl:
              `/api/avatars/${newFileId}`,

            user:
              publicUser(
                user
              ),
          });
      } catch (error) {
        console.error(
          "Upload avatar error:",
          error
        );

        if (newFileId) {
          await deleteFile(
            newFileId
          );
        }

        return res
          .status(500)
          .json({
            success: false,

            message:
              "Failed to save profile photo.",
          });
      }
    }
  );

  /* =======================================================
     REMOVE PROFILE IMAGE
  ======================================================= */

  app.delete(
    "/api/profile/avatar",

    authenticateUser,

    async (req, res) => {
      try {
        const user =
          await User.findById(
            req.user.userId
          );

        if (!user) {
          return res
            .status(404)
            .json({
              success: false,

              message:
                "User account not found.",
            });
        }

        const oldFileId =
          user.avatarFileId ||
          null;

        user.avatarFileId =
          null;

        await user.save();

        if (
          user.role ===
          "worker"
        ) {
          await Worker.findOneAndUpdate(
            {
              user:
                user._id,
            },

            {
              avatarFileId:
                null,
            }
          );
        }

        if (oldFileId) {
          await deleteFile(
            oldFileId
          );
        }

        return res
          .status(200)
          .json({
            success: true,

            message:
              "Profile photo removed successfully.",

            avatarFileId:
              null,

            avatarUrl:
              null,

            user:
              publicUser(
                user
              ),
          });
      } catch (error) {
        console.error(
          "Delete avatar error:",
          error
        );

        return res
          .status(500)
          .json({
            success: false,

            message:
              "Failed to remove profile photo.",
          });
      }
    }
  );

  /* =======================================================
     GET CURRENT USER
  ======================================================= */

  app.get(
    "/api/auth/me",

    authenticateUser,

    async (req, res) => {
      try {
        const user =
          await User.findById(
            req.user.userId
          );

        if (!user) {
          return res
            .status(404)
            .json({
              success: false,

              message:
                "User account not found.",
            });
        }

        return res
          .status(200)
          .json({
            success: true,

            user:
              publicUser(
                user
              ),
          });
      } catch (error) {
        console.error(
          "Get current user error:",
          error
        );

        return res
          .status(500)
          .json({
            success: false,

            message:
              "Failed to load account.",
          });
      }
    }
  );
}

module.exports = {
  registerAvatarRoutes,
  publicUser,
  deleteFile,
};