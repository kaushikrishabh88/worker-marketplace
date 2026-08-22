import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./useToast";

function Auth() {
  const navigate = useNavigate();
  const toast = useToast();

  const rememberedEmail =
    localStorage.getItem(
      "workmateRememberEmail"
    ) || "";

  const [mode, setMode] =
    useState("login");

  const [formData, setFormData] =
    useState({
      name: "",
      email: rememberedEmail,
      password: "",
      role: "worker",
    });

  const [loading, setLoading] =
    useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    rememberMe,
    setRememberMe,
  ] = useState(
    Boolean(rememberedEmail)
  );

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
     LOGIN / REGISTER
  ========================================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    try {
      setLoading(true);

      const endpoint =
        mode === "login"
          ? "http://localhost:5000/api/auth/login"
          : "http://localhost:5000/api/auth/register";

      const requestBody =
        mode === "login"
          ? {
              email:
                formData.email
                  .trim()
                  .toLowerCase(),

              password:
                formData.password,
            }
          : {
              name:
                formData.name.trim(),

              email:
                formData.email
                  .trim()
                  .toLowerCase(),

              password:
                formData.password,

              role:
                formData.role,
            };

      const response = await fetch(
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

      /* =====================================================
         SAVE LOGIN
      ===================================================== */

      localStorage.setItem(
        "workmateToken",
        data.token
      );

      localStorage.setItem(
        "workmateUser",
        JSON.stringify(data.user)
      );

      /* =====================================================
         REMEMBER EMAIL
      ===================================================== */

      if (rememberMe) {
        localStorage.setItem(
          "workmateRememberEmail",
          formData.email
            .trim()
            .toLowerCase()
        );
      } else {
        localStorage.removeItem(
          "workmateRememberEmail"
        );
      }

      toast.success(
        mode === "login"
          ? `Welcome back, ${data.user?.name || "User"}!`
          : "Account created successfully!"
      );

      navigate("/");
    } catch (error) {
      console.error(
        "Authentication error:",
        error
      );

      toast.error(
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

  const changeMode = (newMode) => {
    setMode(newMode);
    setShowPassword(false);

    const savedEmail =
      localStorage.getItem(
        "workmateRememberEmail"
      ) || "";

    setFormData({
      name: "",

      email:
        newMode === "login"
          ? savedEmail
          : "",

      password: "",
      role: "worker",
    });

    setRememberMe(
      newMode === "login" &&
        Boolean(savedEmail)
    );
  };

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section className="auth-page">
      <div className="auth-card">
        {/* ===================================================
            BACK
        =================================================== */}

        <button
          className="auth-back"
          type="button"
          onClick={() =>
            navigate("/")
          }
        >
          ← Back to Home
        </button>

        {/* ===================================================
            LOGO
        =================================================== */}

        <div className="auth-logo">
          <span>Work</span>Mate
        </div>

        {/* ===================================================
            TABS
        =================================================== */}

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

        {/* ===================================================
            HEADING
        =================================================== */}

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

        {/* ===================================================
            FORM
        =================================================== */}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          {/* NAME */}

          {mode === "register" && (
            <div className="auth-field">
              <label htmlFor="auth-name">
                Full Name
              </label>

              <input
                id="auth-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={
                  handleChange
                }
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
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
                onChange={
                  handleChange
                }
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
                      !previous
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                title={
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

          {/* LOGIN OPTIONS */}

          {mode === "login" && (
            <div className="auth-options">
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={
                    rememberMe
                  }
                  onChange={(event) =>
                    setRememberMe(
                      event.target
                        .checked
                    )
                  }
                />

                <span>
                  Remember my email
                </span>
              </label>
            </div>
          )}

          {/* ROLE */}

          {mode === "register" && (
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

        {/* ===================================================
            SWITCH MODE
        =================================================== */}

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
                  : "login"
              )
            }
          >
            {mode === "login"
              ? "Sign Up"
              : "Login"}
          </button>
        </p>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <div className="auth-footer">
          🔒 Your account information is securely
          handled by WorkMate.
        </div>
      </div>
    </section>
  );
}

export default Auth;