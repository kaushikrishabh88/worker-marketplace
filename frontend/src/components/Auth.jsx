import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Auth() {
  const navigate = useNavigate();

  /* =========================================================
     AUTH MODE / ROLE
  ========================================================= */

  const [mode, setMode] = useState("login");

  const [loginRole, setLoginRole] = useState("employer");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "worker",
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(false);

  /* =========================================================
     PROFILE PHOTO
  ========================================================= */

  const [avatarFile, setAvatarFile] = useState(null);

  const [avatarPreview, setAvatarPreview] = useState("");

  /* =========================================================
     INPUT CHANGE
  ========================================================= */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =========================================================
     PROFILE PHOTO CHANGE
  ========================================================= */

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];

    setError("");

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please choose a JPG, PNG or WebP image.",
      );

      event.target.value = "";

      return;
    }

    if (file.size > 1024 * 1024) {
      setError(
        "Profile photo must be 1 MB or smaller.",
      );

      event.target.value = "";

      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    const preview = URL.createObjectURL(file);

    setAvatarFile(file);

    setAvatarPreview(preview);
  };

  /* =========================================================
     REMOVE SELECTED PHOTO
  ========================================================= */

  const removeSelectedAvatar = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(null);

    setAvatarPreview("");
  };

  /* =========================================================
     UPLOAD PROFILE PHOTO
  ========================================================= */

  const uploadAvatar = async (token) => {
    if (!avatarFile) {
      return null;
    }

    const uploadData = new FormData();

    uploadData.append(
      "avatar",
      avatarFile,
    );

    const response = await fetch(
      "http://localhost:5000/api/profile/avatar",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: uploadData,
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Profile photo could not be saved.",
      );
    }

    return data;
  };

  /* =========================================================
     GET CURRENT USER
  ========================================================= */

  const fetchCurrentUser = async (token) => {
    const response = await fetch(
      "http://localhost:5000/api/auth/me",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

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

  const handleSubmit = async (event) => {
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
              email: formData.email,
              password:
                formData.password,
            }
          : {
              name: formData.name,
              email: formData.email,
              password:
                formData.password,
              role: formData.role,
            };

      const response = await fetch(
        endpoint,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            requestBody,
          ),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (mode === "login"
              ? "Login failed."
              : "Registration failed."),
        );
      }

      let finalUser = data.user;

      /* =====================================================
         VERIFY LOGIN ROLE
      ===================================================== */

      if (
        mode === "login" &&
        data.user?.role !== loginRole
      ) {
        const selectedRole =
          loginRole === "employer"
            ? "Employer"
            : "Worker";

        throw new Error(
          `This account is not registered as an ${selectedRole}. Please select the correct login type.`,
        );
      }

      /* =====================================================
         REGISTER AVATAR
      ===================================================== */

      if (
        mode === "register" &&
        avatarFile
      ) {
        const avatarData =
          await uploadAvatar(
            data.token,
          );

        if (avatarData?.user) {
          finalUser =
            avatarData.user;
        }

        const freshUser =
          await fetchCurrentUser(
            data.token,
          );

        if (freshUser) {
          finalUser = freshUser;
        }
      }

      /* =====================================================
         LOGIN REFRESH
      ===================================================== */

      if (mode === "login") {
        const freshUser =
          await fetchCurrentUser(
            data.token,
          );

        if (freshUser) {
          finalUser = freshUser;
        }
      }

      /* =====================================================
         SAVE LOGIN
      ===================================================== */

      localStorage.setItem(
        "workmateToken",
        data.token,
      );

      localStorage.setItem(
        "workmateUser",
        JSON.stringify(finalUser),
      );

      /* =====================================================
         REMEMBER EMAIL
      ===================================================== */

      if (rememberMe) {
        localStorage.setItem(
          "workmateRememberEmail",
          formData.email,
        );
      } else {
        localStorage.removeItem(
          "workmateRememberEmail",
        );
      }

      removeSelectedAvatar();

      navigate("/");

      window.location.reload();
    } catch (error) {
      console.error(
        "Authentication error:",
        error,
      );

      setError(
        error.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     CHANGE LOGIN / SIGNUP MODE
  ========================================================= */

  const changeMode = (newMode) => {
    setMode(newMode);

    setError("");

    setShowPassword(false);

    removeSelectedAvatar();

    setFormData({
      name: "",

      email:
        newMode === "login"
          ? localStorage.getItem(
              "workmateRememberEmail",
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
    formData.role === "employer"
      ? "💼"
      : "👨‍🍳";

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section className="auth-page">
      <div className="auth-shell">
        {/* =====================================================
            LEFT SHOWCASE
        ===================================================== */}

        <aside className="auth-showcase">
          <div className="auth-showcase-brand">
            <div className="auth-showcase-logo">
              <span className="auth-showcase-logo-mark">
                ◆
              </span>

              <div>
                <strong>
                  Work
                  <span>Mate</span>
                </strong>

                <small>
                  Local skills. Real
                  opportunities.
                </small>
              </div>
            </div>

            <div className="auth-showcase-copy">
              <span className="auth-showcase-kicker">
                WORK • HIRE • GROW
              </span>

              <h1>
                Find Work.
                <br />

                <em>
                  Hire Right.
                </em>
              </h1>

              <p>
                WorkMate connects
                skilled food-service
                workers with trusted
                employers and better
                local opportunities.
              </p>
            </div>

            <div className="auth-showcase-benefits">
              {/* EMPLOYERS */}

              <div className="auth-benefit-card">
                <div className="auth-benefit-icon auth-benefit-icon-employer">
                  💼
                </div>

                <div>
                  <strong>
                    For Employers
                  </strong>

                  <p>
                    Find reliable
                    kitchen and food
                    service workers
                    quickly.
                  </p>
                </div>
              </div>

              {/* WORKERS */}

              <div className="auth-benefit-card">
                <div className="auth-benefit-icon auth-benefit-icon-worker">
                  👨‍🍳
                </div>

                <div>
                  <strong>
                    For Skilled Workers
                  </strong>

                  <p>
                    Find Chef, Baker,
                    Fast Food and
                    Halwai opportunities
                    near you.
                  </p>
                </div>
              </div>

              {/* TRUST */}

              <div className="auth-benefit-card">
                <div className="auth-benefit-icon auth-benefit-icon-trust">
                  🛡️
                </div>

                <div>
                  <strong>
                    Safe & Trusted
                  </strong>

                  <p>
                    Clear profiles,
                    direct requests
                    and reliable local
                    connections.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              SKILL SCENE
          ================================================= */}

          <div
            className="auth-worker-scene"
            aria-hidden="true"
          >
            <div className="auth-scene-sun"></div>

            <div className="auth-scene-city">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="auth-scene-workers">
              <div>
                <span>
                  👨‍🍳
                </span>

                <small>
                  Chef & Cook
                </small>
              </div>

              <div>
                <span>
                  🍰
                </span>

                <small>
                  Baker
                </small>
              </div>

              <div>
                <span>
                  🍕
                </span>

                <small>
                  Fast Food
                </small>
              </div>

              <div>
                <span>
                  🍬
                </span>

                <small>
                  Halwai
                </small>
              </div>
            </div>
          </div>
        </aside>

        {/* =====================================================
            RIGHT AUTH CARD
        ===================================================== */}

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
            <span>Work</span>
            Mate
          </div>

          {/* =================================================
              LOGIN / SIGN UP
          ================================================= */}

          <div className="auth-tabs">
            <button
              type="button"
              className={
                mode === "login"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeMode("login")
              }
            >
              Login
            </button>

            <button
              type="button"
              className={
                mode === "register"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeMode("register")
              }
            >
              Sign Up
            </button>
          </div>

          {/* =================================================
              EMPLOYER / WORKER LOGIN SELECTOR
          ================================================= */}

          {mode === "login" && (
            <div
              className="auth-login-role-tabs"
              role="group"
              aria-label="Choose login type"
            >
              <button
                type="button"
                className={
                  loginRole ===
                  "employer"
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setLoginRole(
                    "employer",
                  );

                  setError("");
                }}
              >
                💼 Employer Login
              </button>

              <button
                type="button"
                className={
                  loginRole ===
                  "worker"
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setLoginRole(
                    "worker",
                  );

                  setError("");
                }}
              >
                👨‍🍳 Worker Login
              </button>
            </div>
          )}

          {/* =================================================
              HEADING
          ================================================= */}

          <div className="auth-heading">
            <h1>
              {mode === "login"
                ? loginRole ===
                  "employer"
                  ? "Employer Login 💼"
                  : "Worker Login 👨‍🍳"
                : "Create your account"}
            </h1>

            <p>
              {mode === "login"
                ? loginRole ===
                  "employer"
                  ? "Login to hire and manage skilled workers on WorkMate."
                  : "Login to find food-service jobs and manage your work on WorkMate."
                : "Join WorkMate and connect with local opportunities."}
            </p>
          </div>

          {/* =================================================
              FORM
          ================================================= */}

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >
            {/* NAME */}

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
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            {/* PROFILE PHOTO */}

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
                      src={avatarPreview}
                      alt="Profile preview"
                    />
                  ) : (
                    <span>
                      {fallbackEmoji}
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
                  Maximum 1 MB. If no
                  photo is selected,
                  an emoji will be
                  used.
                </small>
              </div>
            )}

            {/* EMAIL */}

            <div className="auth-field">
              <label htmlFor="auth-email">
                Email Address
              </label>

              <input
                id="auth-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            {/* PASSWORD */}

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
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  minLength="6"
                  autoComplete={
                    mode === "login"
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
                      (previous) =>
                        !previous,
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

            {/* REMEMBER EMAIL */}

            {mode === "login" && (
              <div className="auth-options">
                <label className="auth-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target
                          .checked,
                      )
                    }
                  />

                  <span>
                    Remember my email
                  </span>
                </label>
              </div>
            )}

            {/* REGISTER ROLE */}

            {mode ===
              "register" && (
              <div className="auth-field">
                <label htmlFor="auth-role">
                  I want to join as
                </label>

                <select
                  id="auth-role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="worker">
                    👨‍🍳 Worker
                  </option>

                  <option value="employer">
                    💼 Employer
                  </option>
                </select>
              </div>
            )}

            {/* ERROR */}

            {error && (
              <p className="auth-error">
                ⚠️ {error}
              </p>
            )}

            {/* SUBMIT */}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? mode === "login"
                  ? "Logging in..."
                  : "Creating account..."
                : mode === "login"
                  ? "Login →"
                  : "Create Account →"}
            </button>
          </form>

          {/* =================================================
              MODE SWITCH
          ================================================= */}

          <p className="auth-switch">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              type="button"
              onClick={() =>
                changeMode(
                  mode === "login"
                    ? "register"
                    : "login",
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
      </div>
    </section>
  );
}

export default Auth;