import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API_URL from "../api";

function Auth() {
  const navigate = useNavigate();

  /* =========================================================
     AUTH MODE / ROLE
  ========================================================= */

  const [mode, setMode] = useState("login");

  const [suspensionNotice, setSuspensionNotice] = useState(null);

  /* =========================================================
     RESTORE LIVE SUSPENSION NOTICE
  ========================================================= */

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search,
    );

    if (params.get("suspended") !== "1") {
      return;
    }

    const storedNotice = sessionStorage.getItem(
      "workmateSuspensionNotice",
    );

    if (!storedNotice) {
      return;
    }

    try {
      const notice = JSON.parse(storedNotice);

      setSuspensionNotice({
        message:
          notice.message ||
          "Your WorkMate account has been suspended by an administrator.",
        reason:
          notice.reason ||
          "Please contact WorkMate support for more information.",
      });
    } catch (error) {
      console.error(
        "Restore suspension notice error:",
        error,
      );
    } finally {
      sessionStorage.removeItem(
        "workmateSuspensionNotice",
      );
    }
  }, []);


  const [loginRole, setLoginRole] = useState("employer");

  const [formData, setFormData] = useState({
    name: "",
    email: localStorage.getItem("workmateRememberEmail") || "",
    password: "",
    role: "worker",
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(
    Boolean(localStorage.getItem("workmateRememberEmail")),
  );

  const [verificationEmail, setVerificationEmail] = useState("");

  const [verificationMessage, setVerificationMessage] = useState("");

  const [resendLoading, setResendLoading] = useState(false);

  const [resendError, setResendError] = useState("");

  const [resendSuccess, setResendSuccess] = useState("");

  const [resendCooldown, setResendCooldown] = useState(0);

  /* =========================================================
     FORGOT PASSWORD STATE
  ========================================================= */

  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");

  const [forgotLoading, setForgotLoading] = useState(false);

  const [forgotError, setForgotError] = useState("");

  const [forgotSuccess, setForgotSuccess] = useState("");

  /* =========================================================
     SAFE RESPONSE PARSER
  ========================================================= */

  const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();

    throw new Error(
      text
        ? "Server returned an unexpected response. Please try again."
        : "Unable to connect to the server. Please try again.",
    );
  };

  /* =========================================================
     VERIFICATION RESEND COOLDOWN
  ========================================================= */

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((previous) => (previous > 1 ? previous - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendCooldown]);

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
     GET CURRENT USER
  ========================================================= */

  const fetchCurrentUser = async (token) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseResponse(response);

      if (response.ok && data.user) {
        return data.user;
      }

      return null;
    } catch (fetchError) {
      console.error("Fetch current user error:", fetchError);

      return null;
    }
  };

  /* =========================================================
     FORGOT PASSWORD
  ========================================================= */

  const handleForgotPassword = async (event) => {
    event.preventDefault();

    setForgotError("");
    setForgotSuccess("");

    const cleanEmail = forgotEmail.trim();

    if (!cleanEmail) {
      setForgotError("Please enter your email address.");

      return;
    }

    try {
      setForgotLoading(true);

      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: cleanEmail,
        }),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to send reset link.");
      }

      setForgotSuccess(
        data.message ||
          "If an account exists for this email, a password reset link has been sent.",
      );
    } catch (forgotPasswordError) {
      console.error("Forgot password error:", forgotPasswordError);

      setForgotError(
        forgotPasswordError.message || "Unable to send reset link.",
      );
    } finally {
      setForgotLoading(false);
    }
  };

  /* =========================================================
     RESEND VERIFICATION EMAIL
  ========================================================= */

  const handleResendVerification = async () => {
    const cleanEmail = verificationEmail.trim();

    if (!cleanEmail) {
      setResendError("Email address is required.");

      return;
    }

    if (resendLoading || resendCooldown > 0) {
      return;
    }

    setResendError("");
    setResendSuccess("");

    try {
      setResendLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/resend-verification`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: cleanEmail,
          }),
        },
      );

      const data = await parseResponse(response);

      if (!response.ok) {
        if (Number.isFinite(Number(data.retryAfter))) {
          setResendCooldown(Math.max(0, Number(data.retryAfter)));
        }

        throw new Error(
          data.message || "Unable to resend verification email.",
        );
      }

      const successMessage =
        data.message ||
        "A new verification email has been sent. Please check your inbox.";

      setResendSuccess(successMessage);

      setVerificationMessage(successMessage);

      if (Number.isFinite(Number(data.retryAfter))) {
        setResendCooldown(Math.max(0, Number(data.retryAfter)));
      } else {
        setResendCooldown(60);
      }
    } catch (resendVerificationError) {
      console.error("Resend verification error:", resendVerificationError);

      setResendError(
        resendVerificationError.message ||
          "Unable to resend verification email.",
      );
    } finally {
      setResendLoading(false);
    }
  };

  /* =========================================================
     LOGIN / REGISTER
  ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuspensionNotice(null);

    try {
      const endpoint =
        mode === "login"
          ? `${API_URL}/api/auth/login`
          : `${API_URL}/api/auth/register`;

      const requestBody =
        mode === "login"
          ? {
              email: formData.email.trim(),
              password: formData.password,
            }
          : {
              name: formData.name.trim(),
              email: formData.email.trim(),
              password: formData.password,
              role: formData.role,
            };

      const response = await fetch(endpoint, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(requestBody),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        if (data.accountSuspended) {
          setSuspensionNotice({
            message:
              data.message ||
              "Your WorkMate account has been suspended by an administrator.",
            reason:
              data.reason ||
              "Please contact WorkMate support for more information.",
          });

          setFormData((previous) => ({
            ...previous,
            password: "",
          }));

          return;
        }

        if (data.verificationRequired) {
          const email = data.email || formData.email.trim();

          setVerificationEmail(email);

          setVerificationMessage(
            data.message || "Please verify your email before logging in.",
          );

          setResendError("");
          setResendSuccess("");

          if (Number.isFinite(Number(data.retryAfter))) {
            setResendCooldown(Math.max(0, Number(data.retryAfter)));
          }

          setFormData((previous) => ({
            ...previous,
            email,
            password: "",
          }));

          return;
        }

        throw new Error(
          data.message ||
            (mode === "login" ? "Login failed." : "Registration failed."),
        );
      }

      /* =====================================================
         REGISTRATION SUCCESS
         EMAIL VERIFICATION REQUIRED
      ===================================================== */

      if (mode === "register") {
        setVerificationEmail(data.email || formData.email.trim());

        setVerificationMessage(
          data.message ||
            "We sent a verification link to your email address.",
        );

        setResendError("");
        setResendSuccess("");

        if (Number.isFinite(Number(data.retryAfter))) {
          setResendCooldown(Math.max(0, Number(data.retryAfter)));
        }

        setFormData((previous) => ({
          ...previous,
          password: "",
        }));

        return;
      }

      /* =====================================================
         LOGIN ROLE CHECK
      ===================================================== */

      if (data.user?.role !== loginRole) {
        const selectedRole =
          loginRole === "employer" ? "Employer" : "Worker";

        throw new Error(
          `This account is not registered as an ${selectedRole}. Please select the correct login type.`,
        );
      }

      let finalUser = data.user;

      /* =====================================================
         LOGIN REFRESH
      ===================================================== */

      const freshUser = await fetchCurrentUser(data.token);

      if (freshUser) {
        finalUser = freshUser;
      }

      /* =====================================================
         SAVE LOGIN
      ===================================================== */

      localStorage.setItem("workmateToken", data.token);

      localStorage.setItem("workmateUser", JSON.stringify(finalUser));

      /* =====================================================
         REMEMBER EMAIL
      ===================================================== */

      if (rememberMe) {
        localStorage.setItem(
          "workmateRememberEmail",
          formData.email.trim(),
        );
      } else {
        localStorage.removeItem("workmateRememberEmail");
      }

      navigate("/");

      window.location.reload();
    } catch (authenticationError) {
      console.error("Authentication error:", authenticationError);

      if (authenticationError instanceof TypeError) {
        setError(
          "Unable to connect to WorkMate server. Please check your connection and try again.",
        );
      } else {
        setError(
          authenticationError.message ||
            "Something went wrong. Please try again.",
        );
      }
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

    setVerificationEmail("");

    setVerificationMessage("");

    setResendError("");
    setResendSuccess("");
    setResendCooldown(0);
    setResendLoading(false);

    setShowPassword(false);

    setShowForgotPassword(false);

    setForgotEmail("");
    setForgotError("");
    setForgotSuccess("");

    setFormData({
      name: "",

      email:
        newMode === "login"
          ? localStorage.getItem("workmateRememberEmail") || ""
          : "",

      password: "",
      role: "worker",
    });
  };

  /* =========================================================
     OPEN FORGOT PASSWORD
  ========================================================= */

  const openForgotPassword = () => {
    setForgotEmail(formData.email || "");

    setForgotError("");
    setForgotSuccess("");

    setShowForgotPassword(true);
  };

  /* =========================================================
     BACK TO LOGIN
  ========================================================= */

  const backToLogin = () => {
    setShowForgotPassword(false);

    setForgotError("");
    setForgotSuccess("");

    setMode("login");

    setFormData((previous) => ({
      ...previous,

      email: forgotEmail || previous.email,

      password: "",
    }));
  };

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
              <span className="auth-showcase-logo-mark">◆</span>

              <div>
                <strong>
                  Work<span>Mate</span>
                </strong>

                <small>Local skills. Real opportunities.</small>
              </div>
            </div>

            <div className="auth-showcase-copy">
              <span className="auth-showcase-kicker">WORK • HIRE • GROW</span>

              <h1>
                Find Work.
                <br />
                <em>Hire Right.</em>
              </h1>

              <p>
                WorkMate connects skilled food-service workers with trusted
                employers and better local opportunities.
              </p>
            </div>

            <div className="auth-showcase-benefits">
              <div className="auth-benefit-card">
                <div className="auth-benefit-icon auth-benefit-icon-employer">
                  💼
                </div>

                <div>
                  <strong>For Employers</strong>

                  <p>
                    Find reliable kitchen and food service workers quickly.
                  </p>
                </div>
              </div>

              <div className="auth-benefit-card">
                <div className="auth-benefit-icon auth-benefit-icon-worker">
                  👨‍🍳
                </div>

                <div>
                  <strong>For Skilled Workers</strong>

                  <p>
                    Find Chef, Baker, Fast Food and Halwai opportunities near
                    you.
                  </p>
                </div>
              </div>

              <div className="auth-benefit-card">
                <div className="auth-benefit-icon auth-benefit-icon-trust">
                  🛡️
                </div>

                <div>
                  <strong>Safe & Trusted</strong>

                  <p>
                    Clear profiles, direct requests and reliable local
                    connections.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              SKILL SCENE
          ================================================= */}

          <div className="auth-worker-scene" aria-hidden="true">
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
                <span>👨‍🍳</span>

                <small>Chef & Cook</small>
              </div>

              <div>
                <span>🍰</span>

                <small>Baker</small>
              </div>

              <div>
                <span>🍕</span>

                <small>Fast Food</small>
              </div>

              <div>
                <span>🍬</span>

                <small>Halwai</small>
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
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </button>

          <div className="auth-logo">
            <span>Work</span>
            Mate
          </div>

          {/* =================================================
              LOGIN / SIGNUP TABS
          ================================================= */}

          {!showForgotPassword && !verificationEmail && (
            <div className="auth-tabs">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => changeMode("login")}
              >
                Login
              </button>

              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                onClick={() => changeMode("register")}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* =================================================
              EMPLOYER / WORKER LOGIN SELECTOR
          ================================================= */}

          {mode === "login" &&
            !showForgotPassword &&
            !verificationEmail && (
              <div
                className="auth-login-role-tabs"
                role="group"
                aria-label="Choose login type"
              >
                <button
                  type="button"
                  className={loginRole === "employer" ? "active" : ""}
                  onClick={() => {
                    setLoginRole("employer");

                    setError("");
                  }}
                >
                  💼 Employer Login
                </button>

                <button
                  type="button"
                  className={loginRole === "worker" ? "active" : ""}
                  onClick={() => {
                    setLoginRole("worker");

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

          {!verificationEmail && (
            <div className="auth-heading">
              <h1>
                {showForgotPassword
                  ? "Reset your password"
                  : mode === "login"
                    ? loginRole === "employer"
                      ? "Employer Login 💼"
                      : "Worker Login 👨‍🍳"
                    : "Create your account"}
              </h1>

              <p>
                {showForgotPassword
                  ? "Enter the email linked to your WorkMate account and we'll send you a secure reset link."
                  : mode === "login"
                    ? loginRole === "employer"
                      ? "Login to hire and manage skilled workers on WorkMate."
                      : "Login to find food-service jobs and manage your work on WorkMate."
                    : "Join WorkMate and connect with local opportunities."}
              </p>
            </div>
          )}

          {/* =================================================
              FORGOT / VERIFICATION / NORMAL FORM
          ================================================= */}

          {showForgotPassword ? (
            <div className="forgot-password-panel">
              <div className="forgot-password-icon">🔐</div>

              <span className="forgot-password-kicker">ACCOUNT RECOVERY</span>

              {!forgotSuccess ? (
                <form
                  className="auth-form forgot-password-form"
                  onSubmit={handleForgotPassword}
                >
                  <div className="auth-field">
                    <label htmlFor="forgot-email">Email Address</label>

                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(event) => setForgotEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </div>

                  {forgotError && (
                    <p className="auth-error">⚠️ {forgotError}</p>
                  )}

                  <button
                    className="auth-submit"
                    type="submit"
                    disabled={forgotLoading}
                  >
                    {forgotLoading
                      ? "Sending reset link..."
                      : "Send Reset Link →"}
                  </button>

                  <button
                    type="button"
                    className="forgot-password-back"
                    onClick={backToLogin}
                    disabled={forgotLoading}
                  >
                    ← Back to Login
                  </button>
                </form>
              ) : (
                <div className="forgot-password-success">
                  <div className="forgot-password-success-icon">✉️</div>

                  <h2>Check your inbox</h2>

                  <p>{forgotSuccess}</p>

                  <strong>{forgotEmail}</strong>

                  <div className="forgot-password-note">
                    The reset link expires in 30 minutes and can only be used
                    once.
                  </div>

                  <button
                    type="button"
                    className="auth-submit"
                    onClick={backToLogin}
                  >
                    Back to Login →
                  </button>
                </div>
              )}
            </div>
          ) : verificationEmail ? (
            <div className="auth-verification-success">
              <div className="auth-verification-success-icon">✉️</div>

              <span className="auth-verification-kicker">
                EMAIL VERIFICATION
              </span>

              <h2>Check your inbox</h2>

              <p>
                {verificationMessage ||
                  "We sent a verification link to your email address."}
              </p>

              <strong className="auth-verification-email">
                {verificationEmail}
              </strong>

              <p>
                Open the email and click <strong>Verify Email</strong>. After
                verification, come back here and login to WorkMate.
              </p>

              <div className="auth-verification-note">
                🔒 Your account cannot be used until the email address has been
                verified.
              </div>

              {resendSuccess && (
                <p className="auth-success">✅ {resendSuccess}</p>
              )}

              {resendError && (
                <p className="auth-error">⚠️ {resendError}</p>
              )}

              <button
                type="button"
                className="forgot-password-back"
                onClick={handleResendVerification}
                disabled={resendLoading || resendCooldown > 0}
              >
                {resendLoading
                  ? "Sending verification email..."
                  : resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : "Resend Verification Email"}
              </button>

              <button
                type="button"
                className="auth-submit"
                onClick={() => {
                  const email = verificationEmail;

                  setVerificationEmail("");

                  setVerificationMessage("");

                  setResendError("");

                  setResendSuccess("");

                  setResendCooldown(0);

                  setMode("login");

                  setFormData({
                    name: "",
                    email,
                    password: "",
                    role: "worker",
                  });

                  setError("");

                  setShowPassword(false);
                }}
              >
                Go to Login →
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {/* NAME */}

              {mode === "register" && (
                <div className="auth-field">
                  <label htmlFor="auth-name">Full Name</label>

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

              {/* EMAIL */}

              <div className="auth-field">
                <label htmlFor="auth-email">Email Address</label>

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
                <label htmlFor="auth-password">Password</label>

                <div className="auth-password-wrap">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 6 characters"
                    minLength="6"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                  />

                  <button
                    className="auth-password-toggle"
                    type="button"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* LOGIN OPTIONS */}

              {mode === "login" && (
                <div className="auth-options">
                  <label className="auth-remember">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                    />

                    <span>Remember my email</span>
                  </label>

                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={openForgotPassword}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* REGISTER ROLE */}

              {mode === "register" && (
                <div className="auth-field">
                  <label htmlFor="auth-role">I want to join as</label>

                  <select
                    id="auth-role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="worker">👨‍🍳 Worker</option>

                    <option value="employer">💼 Employer</option>
                  </select>
                </div>
              )}

              {/* ERROR */}

              {suspensionNotice && (
                <div
                  className="auth-suspension-notice"
                  role="alert"
                >
                  <div className="auth-suspension-heading">
                    <span
                      className="auth-suspension-icon"
                      aria-hidden="true"
                    >
                      ⚠️
                    </span>

                    <div>
                      <strong>Account Suspended</strong>

                      <p>{suspensionNotice.message}</p>
                    </div>
                  </div>

                  <div className="auth-suspension-reason">
                    <span>Reason</span>

                    <p>{suspensionNotice.reason}</p>
                  </div>

                  <p className="auth-suspension-help">
                    If you believe this was a mistake, you can send an
                    appeal directly to the WorkMate team.
                  </p>

                  <button
                    type="button"
                    className="auth-suspension-support-btn"
                    onClick={() => {
                      const params = new URLSearchParams({
                        support: "suspension",
                        email: formData.email.trim(),
                        role: loginRole,
                        reason: suspensionNotice.reason || "",
                      });

                      navigate(`/?${params.toString()}#contact-us`);
                    }}
                  >
                    Contact WorkMate Support →
                  </button>
                </div>
              )}

              {!suspensionNotice && error && (
                <p className="auth-error">⚠️ {error}</p>
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
          )}

          {/* =================================================
              MODE SWITCH
          ================================================= */}

          {!verificationEmail && !showForgotPassword && (
            <p className="auth-switch">
              {mode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}

              <button
                type="button"
                onClick={() =>
                  changeMode(mode === "login" ? "register" : "login")
                }
              >
                {mode === "login" ? "Sign Up" : "Login"}
              </button>
            </p>
          )}

          <div className="auth-footer">
            🔒 Your account information is securely handled by WorkMate.
          </div>
        </div>
      </div>
    </section>
  );
}

export default Auth;