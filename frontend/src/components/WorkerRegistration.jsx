import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useToast,
} from "./useToast";

import API_URL from "../api";

function WorkerRegistration() {
  const navigate = useNavigate();
  const toast = useToast();

  const token =
    localStorage.getItem(
      "workmateToken",
    );

  /* =========================================================
     LOGGED-IN USER
  ========================================================= */

  const [user, setUser] =
    useState(() => {
      try {
        const storedUser =
          localStorage.getItem(
            "workmateUser",
          );

        return storedUser
          ? JSON.parse(
              storedUser,
            )
          : null;
      } catch (error) {
        console.error(
          "Unable to read logged-in user:",
          error,
        );

        return null;
      }
    });

  /* =========================================================
     FORM STATE
  ========================================================= */

  const [
    formData,
    setFormData,
  ] = useState({
    name: "",
    phone: "",
    skill: "",
    experience: "",
    location: "",
    availability: "",
    salary: "",
    description: "",
  });

  const [
    loading,
    setLoading,
  ] = useState(false);

  /* =========================================================
     PROFILE PHOTO STATE
  ========================================================= */

  const [
    avatarFile,
    setAvatarFile,
  ] = useState(null);

  const [
    avatarPreview,
    setAvatarPreview,
  ] = useState("");

  /* =========================================================
     SAFE RESPONSE PARSER
  ========================================================= */

  const parseResponse =
    async (response) => {
      const contentType =
        response.headers.get(
          "content-type",
        ) || "";

      if (
        contentType.includes(
          "application/json",
        )
      ) {
        return response.json();
      }

      const text =
        await response.text();

      throw new Error(
        text
          ? "The server returned an unexpected response."
          : "Unable to connect to WorkMate server.",
      );
    };

  /* =========================================================
     INPUT CHANGE
  ========================================================= */

  const handleChange = (
    event,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      }),
    );
  };

  /* =========================================================
     PROFILE PHOTO CHANGE
  ========================================================= */

  const handleAvatarChange = (
    event,
  ) => {
    const file =
      event.target
        .files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      toast.error(
        "Only JPG, PNG or WebP images are allowed.",
      );

      event.target.value =
        "";

      return;
    }

    if (
      file.size >
      1024 * 1024
    ) {
      toast.error(
        "Profile photo must be 1 MB or smaller.",
      );

      event.target.value =
        "";

      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(
        avatarPreview,
      );
    }

    const preview =
      URL.createObjectURL(
        file,
      );

    setAvatarFile(file);

    setAvatarPreview(
      preview,
    );
  };

  /* =========================================================
     REMOVE SELECTED PHOTO
  ========================================================= */

  const removeAvatar =
    () => {
      if (avatarPreview) {
        URL.revokeObjectURL(
          avatarPreview,
        );
      }

      setAvatarFile(null);

      setAvatarPreview("");
    };

  /* =========================================================
     UPLOAD PROFILE PHOTO
  ========================================================= */

  const uploadAvatar =
    async () => {
      if (!avatarFile) {
        return user;
      }

      if (!token) {
        throw new Error(
          "Please login again before uploading your profile photo.",
        );
      }

      const avatarData =
        new FormData();

      avatarData.append(
        "avatar",
        avatarFile,
      );

      const response =
        await fetch(
          `${API_URL}/api/profile/avatar`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            body:
              avatarData,
          },
        );

      const data =
        await parseResponse(
          response,
        );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to upload profile photo.",
        );
      }

      if (data.user) {
        localStorage.setItem(
          "workmateUser",
          JSON.stringify(
            data.user,
          ),
        );

        setUser(
          data.user,
        );

        return data.user;
      }

      return user;
    };

  /* =========================================================
     REGISTER WORKER
  ========================================================= */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        !token ||
        !user
      ) {
        toast.warning(
          "Please login as a worker before creating your profile.",
        );

        navigate(
          "/auth",
        );

        return;
      }

      if (
        user.role !==
        "worker"
      ) {
        toast.warning(
          "Only worker accounts can create worker profiles.",
        );

        return;
      }

      if (
        !formData.name.trim() ||
        !formData.phone.trim() ||
        !formData.skill ||
        !formData.experience ||
        !formData.location.trim() ||
        !formData.availability ||
        !formData.salary
      ) {
        toast.warning(
          "Please fill in all required profile fields.",
        );

        return;
      }

      try {
        setLoading(true);

        /* =====================================================
           SAVE DP FIRST

           This remains intentional:
           Worker profile can reuse the User avatar.
        ===================================================== */

        if (avatarFile) {
          await uploadAvatar();
        }

        /* =====================================================
           CREATE WORKER PROFILE
        ===================================================== */

        const response =
          await fetch(
            `${API_URL}/api/workers`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify(
                  {
                    name:
                      formData.name.trim(),

                    phone:
                      formData.phone.trim(),

                    role:
                      formData.skill,

                    skills: [
                      formData.skill,
                    ],

                    location:
                      formData.location.trim(),

                    experience:
                      formData.experience,

                    availability:
                      formData.availability,

                    salary:
                      Number(
                        formData.salary,
                      ),

                    description:
                      formData.description.trim(),

                    emoji:
                      "👨‍🍳",
                  },
                ),
            },
          );

        const data =
          await parseResponse(
            response,
          );

        if (!response.ok) {
          /*
           * Backend duplicate-profile
           * protection.
           */

          if (
            response.status ===
              409 &&
            data.worker?._id
          ) {
            toast.info(
              "You already have a worker profile.",
            );

            navigate(
              `/workers/${data.worker._id}`,
            );

            return;
          }

          throw new Error(
            data.message ||
              "Failed to register worker.",
          );
        }

        /* =====================================================
           REFRESH CURRENT USER FROM DATABASE
        ===================================================== */

        try {
          const meResponse =
            await fetch(
              `${API_URL}/api/auth/me`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              },
            );

          const meData =
            await parseResponse(
              meResponse,
            );

          if (
            meResponse.ok &&
            meData.user
          ) {
            localStorage.setItem(
              "workmateUser",
              JSON.stringify(
                meData.user,
              ),
            );

            setUser(
              meData.user,
            );
          }
        } catch (
          refreshError
        ) {
          console.error(
            "Refresh user after profile creation error:",
            refreshError,
          );
        }

        window.dispatchEvent(
          new Event(
            "workmate-badges-refresh",
          ),
        );

        toast.success(
          "Worker profile created successfully!",
        );

        removeAvatar();

        if (
          data.worker?._id
        ) {
          navigate(
            `/workers/${data.worker._id}`,
          );
        }
      } catch (error) {
        console.error(
          "Worker registration error:",
          error,
        );

        if (
          error instanceof
          TypeError
        ) {
          toast.error(
            "Unable to connect to WorkMate server. Please check your connection and try again.",
          );
        } else {
          toast.error(
            error.message ||
              "Something went wrong while creating your profile.",
          );
        }
      } finally {
        setLoading(
          false,
        );
      }
    };

  /* =========================================================
     AVATAR SOURCE
  ========================================================= */

  const existingAvatarSource =
    user?.avatarUrl
      ? user.avatarUrl.startsWith(
          "http",
        )
        ? user.avatarUrl
        : `${API_URL}${user.avatarUrl}`
      : user?.avatarFileId
        ? `${API_URL}/api/avatars/${user.avatarFileId}`
        : "";

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section
      className="worker-registration"
      id="register-worker"
    >
      <div className="registration-heading">
        <span>
          JOIN WORKMATE
        </span>

        <h2>
          Showcase your skills.
          Find your next
          opportunity.
        </h2>

        <p>
          Create your worker
          profile and let local
          businesses discover your
          skills.
        </p>
      </div>

      <form
        className="registration-form"
        onSubmit={
          handleSubmit
        }
      >
        {/* ===================================================
            PROFILE PHOTO
        =================================================== */}

        <div className="worker-avatar-upload-section">
          <div className="worker-avatar-upload-preview">
            {avatarPreview ? (
              <img
                src={
                  avatarPreview
                }
                alt="Profile preview"
              />
            ) : existingAvatarSource ? (
              <img
                src={
                  existingAvatarSource
                }
                alt={
                  user?.name ||
                  "Profile"
                }
              />
            ) : (
              <span>
                👨‍🍳
              </span>
            )}
          </div>

          <div className="worker-avatar-upload-copy">
            <strong>
              Profile Photo
            </strong>

            <p>
              Add a clear photo so
              local employers can
              recognise you.
            </p>
          </div>

          <div className="worker-avatar-upload-actions">
            <label
              htmlFor="worker-avatar-input"
              className="worker-avatar-upload-btn"
            >
              📷{" "}
              {avatarFile
                ? "Change Photo"
                : "Choose Photo"}
            </label>

            <input
              id="worker-avatar-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={
                handleAvatarChange
              }
              hidden
            />

            {avatarFile && (
              <button
                type="button"
                className="worker-avatar-remove-btn"
                onClick={
                  removeAvatar
                }
              >
                Remove
              </button>
            )}
          </div>

          <small className="worker-avatar-upload-help">
            Optional · JPG, PNG
            or WebP · Maximum
            1 MB
          </small>
        </div>

        {/* ===================================================
            FULL NAME
        =================================================== */}

        <div className="form-group">
          <label htmlFor="name">
            Full Name
          </label>

          <input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your full name"
            value={
              formData.name
            }
            onChange={
              handleChange
            }
            required
          />
        </div>

        {/* ===================================================
            PHONE
        =================================================== */}

        <div className="form-group">
          <label htmlFor="phone">
            Phone Number
          </label>

          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Enter phone number"
            value={
              formData.phone
            }
            onChange={
              handleChange
            }
            required
          />
        </div>

        {/* ===================================================
            SKILL
        =================================================== */}

        <div className="form-group">
          <label htmlFor="skill">
            Primary Skill
          </label>

          <select
            id="skill"
            name="skill"
            value={
              formData.skill
            }
            onChange={
              handleChange
            }
            required
          >
            <option value="">
              Select your skill
            </option>

            <option value="chef">
              Chef / Cook
            </option>

            <option value="baker">
              Baker
            </option>

            <option value="fast-food">
              Fast Food Specialist
            </option>

            <option value="halwai">
              Halwai
            </option>

            <option value="helper">
              Kitchen Helper
            </option>
          </select>
        </div>

        {/* ===================================================
            EXPERIENCE
        =================================================== */}

        <div className="form-group">
          <label htmlFor="experience">
            Experience
          </label>

          <select
            id="experience"
            name="experience"
            value={
              formData.experience
            }
            onChange={
              handleChange
            }
            required
          >
            <option value="">
              Select experience
            </option>

            <option value="0-1">
              0–1 year
            </option>

            <option value="1-3">
              1–3 years
            </option>

            <option value="3-5">
              3–5 years
            </option>

            <option value="5+">
              5+ years
            </option>
          </select>
        </div>

        {/* ===================================================
            LOCATION
        =================================================== */}

        <div className="form-group">
          <label htmlFor="location">
            Location
          </label>

          <input
            id="location"
            name="location"
            type="text"
            placeholder="City / Area"
            value={
              formData.location
            }
            onChange={
              handleChange
            }
            required
          />
        </div>

        {/* ===================================================
            AVAILABILITY
        =================================================== */}

        <div className="form-group">
          <label htmlFor="availability">
            Availability
          </label>

          <select
            id="availability"
            name="availability"
            value={
              formData.availability
            }
            onChange={
              handleChange
            }
            required
          >
            <option value="">
              Select availability
            </option>

            <option value="full-time">
              Full Time
            </option>

            <option value="part-time">
              Part Time
            </option>

            <option value="both">
              Full / Part Time
            </option>
          </select>
        </div>

        {/* ===================================================
            SALARY
        =================================================== */}

        <div className="form-group">
          <label htmlFor="salary">
            Expected Monthly
            Salary (₹)
          </label>

          <input
            id="salary"
            name="salary"
            type="number"
            min="0"
            placeholder="Example: 25000"
            value={
              formData.salary
            }
            onChange={
              handleChange
            }
            required
          />
        </div>

        {/* ===================================================
            DESCRIPTION
        =================================================== */}

        <div className="form-group form-group-full">
          <label htmlFor="description">
            About Your Skills
          </label>

          <textarea
            id="description"
            name="description"
            rows="5"
            placeholder="Tell businesses about your skills and experience..."
            value={
              formData.description
            }
            onChange={
              handleChange
            }
          />
        </div>

        {/* ===================================================
            SUBMIT
        =================================================== */}

        <button
          className="registration-submit"
          type="submit"
          disabled={
            loading
          }
        >
          {loading
            ? avatarFile
              ? "Saving Photo & Profile..."
              : "Creating Profile..."
            : "Create Worker Profile →"}
        </button>
      </form>
    </section>
  );
}

export default WorkerRegistration;