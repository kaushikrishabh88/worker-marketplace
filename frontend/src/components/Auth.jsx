import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Auth() {
  const navigate = useNavigate();

  const [mode, setMode] =
    useState("login");

  const [formData, setFormData] =
    useState({
      name: "",
      email: "",
      password: "",
      role: "worker",
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    rememberMe,
    setRememberMe,
  ] = useState(false);

  /* =========================================================
     PROFILE PHOTO
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
     INPUT CHANGE
  ========================================================= */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =========================================================
     PROFILE PHOTO CHANGE
  ========================================================= */

  const handleAvatarChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    setError("");

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
        file.type
      )
    ) {
      setError(
        "Please choose a JPG, PNG or WebP image."
      );

      event.target.value =
        "";

      return;
    }

    if (
      file.size >
      1024 * 1024
    ) {
      setError(
        "Profile photo must be 1 MB or smaller."
      );

      event.target.value =
        "";

      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(
        avatarPreview
      );
    }

    const preview =
      URL.createObjectURL(
        file
      );

    setAvatarFile(file);

    setAvatarPreview(
      preview
    );
  };

  /* =========================================================
     REMOVE SELECTED PHOTO
  ========================================================= */

  const removeSelectedAvatar =
    () => {
      if (avatarPreview) {
        URL.revokeObjectURL(
          avatarPreview
        );
      }

      setAvatarFile(null);

      setAvatarPreview("");
    };

  /* =========================================================
     UPLOAD PROFILE PHOTO
  ========================================================= */

  const uploadAvatar = async (
    token
  ) => {
    if (!avatarFile) {
      return null;
    }

    const uploadData =
      new FormData();

    uploadData.append(
      "avatar",
      avatarFile
    );

    const response =
      await fetch(
        "http://localhost:5000/api/profile/avatar",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          body: uploadData,
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Profile photo could not be saved."
      );
    }

    return data;
  };

  /* =========================================================
     GET CURRENT USER
  ========================================================= */

  const fetchCurrentUser =
    async (token) => {
      const response =
        await fetch(
          "http://localhost:5000/api/auth/me",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json();

      if (
        response.ok &&
        data.user
      ) {
        return data.user;
      }

      return null;
    };

  /* =========================================================
     LOGIN / REGISTER
  ========================================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setLoading(true);

    setError("");

    try {
      const endpoint =
        mode === "login"
          ? "http://localhost:5000/api/auth/login"
          : "http://localhost:5000/api/auth/register";

      const requestBody =
        mode === "login"
          ? {
              email:
                formData.email,

              password:
                formData.password,
            }
          : {
              name:
                formData.name,

              email:
                formData.email,

              password:
                formData.password,

              role:
                formData.role,
            };

      const response =
        await fetch(
          endpoint,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                requestBody
              ),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (mode === "login"
              ? "Login failed."
              : "Registration failed.")
        );
      }

      let finalUser =
        data.user;

      /* =====================================================
         REGISTER AVATAR
      ===================================================== */

      if (
        mode === "register" &&
        avatarFile
      ) {
        const avatarData =
          await uploadAvatar(
            data.token
          );

        if (
          avatarData?.user
        ) {
          finalUser =
            avatarData.user;
        }

        const freshUser =
          await fetchCurrentUser(
            data.token
          );

        if (freshUser) {
          finalUser =
            freshUser;
        }
      }

      /* =====================================================
         LOGIN REFRESH
         Important:
         Always refresh user from DB so avatar does not vanish
         after logout/login.
      ===================================================== */

      if (
        mode === "login"
      ) {
        const freshUser =
          await fetchCurrentUser(
            data.token
          );

        if (freshUser) {
          finalUser =
            freshUser;
        }
      }

      /* =====================================================
         SAVE LOGIN
      ===================================================== */

      localStorage.setItem(
        "workmateToken",
        data.token
      );

      localStorage.setItem(
        "workmateUser",
        JSON.stringify(
          finalUser
        )
      );

      /* =====================================================
         REMEMBER EMAIL
      ===================================================== */

      if (rememberMe) {
        localStorage.setItem(
          "workmateRememberEmail",
          formData.email
        );
      } else {
        localStorage.removeItem(
          "workmateRememberEmail"
        );
      }

      removeSelectedAvatar();

      navigate("/");

      window.location.reload();
    } catch (error) {
      console.error(
        "Authentication error:",
        error
      );

      setError(
        error.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     CHANGE LOGIN / SIGNUP MODE
  ========================================================= */

  const changeMode = (
    newMode
  ) => {
    setMode(newMode);

    setError("");

    setShowPassword(false);

    removeSelectedAvatar();

    setFormData({
      name: "",

      email:
        newMode === "login"
          ? localStorage.getItem(
              "workmateRememberEmail"
            ) || ""
          : "",

      password: "",

      role: "worker",
    });
  };

  /* =========================================================
     FALLBACK EMOJI
  ========================================================= */

  const fallbackEmoji =
    formData.role ===
    "employer"
      ? "💼"
      : "👨‍🍳";

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section className="auth-page">
      <div className="auth-card">

        <button
          className="auth-back"
          type="button"
          onClick={() =>
            navigate("/")
          }
        >
          ← Back to Home
        </button>

        <div className="auth-logo">
          <span>Work</span>Mate
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={
              mode === "login"
                ? "active"
                : ""
            }
            onClick={() =>
              changeMode(
                "login"
              )
            }
          >
            Login
          </button>

          <button
            type="button"
            className={
              mode ===
              "register"
                ? "active"
                : ""
            }
            onClick={() =>
              changeMode(
                "register"
              )
            }
          >
            Sign Up
          </button>
        </div>

        <div className="auth-heading">
          <h1>
            {mode === "login"
              ? "Welcome back 👋"
              : "Create your account"}
          </h1>

          <p>
            {mode === "login"
              ? "Login to continue to WorkMate."
              : "Join WorkMate and connect with local opportunities."}
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={
            handleSubmit
          }
        >

          {mode ===
            "register" && (
            <div className="auth-field">
              <label htmlFor="auth-name">
                Full Name
              </label>

              <input
                id="auth-name"
                type="text"
                name="name"
                value={
                  formData.name
                }
                onChange={
                  handleChange
                }
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </div>
          )}

          {mode ===
            "register" && (
            <div className="auth-avatar-section">

              <label className="auth-avatar-label">
                Profile Photo

                <span>
                  Optional
                </span>
              </label>

              <div className="auth-avatar-preview">
                {avatarPreview ? (
                  <img
                    src={
                      avatarPreview
                    }
                    alt="Profile preview"
                  />
                ) : (
                  <span>
                    {
                      fallbackEmoji
                    }
                  </span>
                )}
              </div>

              <div className="auth-avatar-actions">
                <label
                  className="auth-avatar-upload"
                  htmlFor="auth-avatar"
                >
                  📷 Choose Photo
                </label>

                <input
                  id="auth-avatar"
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
                    className="auth-avatar-remove"
                    onClick={
                      removeSelectedAvatar
                    }
                  >
                    Remove
                  </button>
                )}
              </div>

              <small className="auth-avatar-help">
                JPG, PNG or WebP.
                Maximum 1 MB.
                If no photo is
                selected, an emoji
                will be used.
              </small>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">
              Email Address
            </label>

            <input
              id="auth-email"
              type="email"
              name="email"
              value={
                formData.email
              }
              onChange={
                handleChange
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">
              Password
            </label>

            <div className="auth-password-wrap">
              <input
                id="auth-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="password"
                value={
                  formData.password
                }
                onChange={
                  handleChange
                }
                placeholder="Minimum 6 characters"
                minLength="6"
                autoComplete={
                  mode ===
                  "login"
                    ? "current-password"
                    : "new-password"
                }
                required
              />

              <button
                className="auth-password-toggle"
                type="button"
                onClick={() =>
                  setShowPassword(
                    (
                      previous
                    ) =>
                      !previous
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword
                  ? "🙈"
                  : "👁️"}
              </button>
            </div>
          </div>

          {mode === "login" && (
            <div className="auth-options">
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={
                    rememberMe
                  }
                  onChange={(
                    event
                  ) =>
                    setRememberMe(
                      event
                        .target
                        .checked
                    )
                  }
                />

                <span>
                  Remember my
                  email
                </span>
              </label>
            </div>
          )}

          {mode ===
            "register" && (
            <div className="auth-field">
              <label htmlFor="auth-role">
                I want to join as
              </label>

              <select
                id="auth-role"
                name="role"
                value={
                  formData.role
                }
                onChange={
                  handleChange
                }
              >
                <option value="worker">
                  👷 Worker
                </option>

                <option value="employer">
                  💼 Employer
                </option>
              </select>
            </div>
          )}

          {error && (
            <p className="auth-error">
              ⚠️ {error}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? mode ===
                "login"
                ? "Logging in..."
                : "Creating account..."
              : mode ===
                  "login"
                ? "Login →"
                : "Create Account →"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            type="button"
            onClick={() =>
              changeMode(
                mode ===
                  "login"
                  ? "register"
                  : "login"
              )
            }
          >
            {mode === "login"
              ? "Sign Up"
              : "Login"}
          </button>
        </p>

        <div className="auth-footer">
          🔒 Your account
          information is securely
          handled by WorkMate.
        </div>
      </div>
    </section>
  );
}

export default Auth;