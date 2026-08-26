import "./App.css";

import ToastProvider from "./components/ToastProvider";

import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";

import { useState } from "react";

import FindWorker from "./components/FindWorker";
import WorkerRegistration from "./components/WorkerRegistration";
import WorkerProfile from "./components/WorkerProfile";
import JobPosting from "./components/JobPosting";
import Auth from "./components/Auth";
import FindJobs from "./components/FindJobs";
import SentRequests from "./components/SentRequests";
import ReceivedRequests from "./components/ReceivedRequests";
import MyJobs from "./components/MyJobs";
import MyApplications from "./components/MyApplications";
import DashboardSummary from "./components/DashboardSummary";
import NavBadges from "./components/NavBadges";
import ProfileAvatar from "./components/ProfileAvatar";
import EmployerProfile from "./components/EmployerProfile";
import SavedWorkers from "./components/SavedWorkers";
import ContactUs from "./components/ContactUs";
import AdminLogin from "./components/AdminLogin";
import AdminMessages from "./components/AdminMessages";
import AdminDirectory from "./components/AdminDirectory";
import VerifyEmail from "./components/VerifyEmail";
import ResetPassword from "./components/ResetPassword";

import { useLanguage } from "./i18n/useLanguage";
import API_URL from "./api";

function HomePage() {
  const navigate = useNavigate();

  /* =========================================================
     ACCOUNT / PASSWORD STATE
  ========================================================= */

  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const [showSettings, setShowSettings] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordMessage, setPasswordMessage] = useState("");

  const [passwordError, setPasswordError] = useState("");

  const [changingPassword, setChangingPassword] = useState(false);

  const [openingProfile, setOpeningProfile] = useState(false);

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");

  const [deleteAccountError, setDeleteAccountError] = useState("");

  const [deletingAccount, setDeletingAccount] = useState(false);

  /* =========================================================
     PASSWORD FORM
  ========================================================= */

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleOpenPasswordForm = () => {
    setShowAccountMenu(false);
    setShowSettings(false);

    setShowPasswordForm(true);

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setPasswordMessage("");
    setPasswordError("");
  };

  const handleClosePasswordForm = () => {
    if (changingPassword) {
      return;
    }

    setShowPasswordForm(false);

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setPasswordMessage("");
    setPasswordError("");
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordError("Please fill in all password fields.");

      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirm password do not match.");

      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");

      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError(
        "New password must be different from your current password.",
      );

      return;
    }

    const token = localStorage.getItem("workmateToken");

    if (!token) {
      setPasswordError("Please login again.");

      return;
    }

    try {
      setChangingPassword(true);

      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,

          newPassword: passwordForm.newPassword,

          confirmPassword: passwordForm.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to change password.");
      }

      setPasswordMessage(data.message || "Password changed successfully.");

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Change password error:", error);

      setPasswordError(error.message || "Unable to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  /* =========================================================
     LANGUAGE
  ========================================================= */

  const { language, changeLanguage, t } = useLanguage();

  /* =========================================================
     LOGGED IN USER
  ========================================================= */

  let user = null;

  try {
    const storedUser = localStorage.getItem("workmateUser");

    if (storedUser) {
      user = JSON.parse(storedUser);
    }
  } catch (error) {
    console.error("Failed to read logged-in user:", error);

    localStorage.removeItem("workmateUser");

    localStorage.removeItem("workmateToken");
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  const goToAuth = () => {
    navigate("/auth");
  };

  const handleLogout = () => {
    localStorage.removeItem("workmateToken");

    localStorage.removeItem("workmateUser");

    setShowAccountMenu(false);
    setShowSettings(false);
    setShowPasswordForm(false);
    setShowDeleteAccount(false);

    navigate("/");

    window.location.reload();
  };

  /* =========================================================
     ACCOUNT SETTINGS
  ========================================================= */

  const handleOpenSettings = () => {
    setShowAccountMenu(false);
    setShowPasswordForm(false);

    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleSettingsProfile = async () => {
    setShowSettings(false);

    await handleMyProfile();
  };

  const handleSettingsPassword = () => {
    setShowSettings(false);

    handleOpenPasswordForm();
  };

  const handleSettingsLogout = () => {
    setShowSettings(false);

    handleLogout();
  };

  /* =========================================================
     DELETE ACCOUNT
  ========================================================= */

  const handleOpenDeleteAccount = () => {
    setShowAccountMenu(false);
    setShowSettings(false);
    setShowPasswordForm(false);

    setDeleteAccountPassword("");
    setDeleteAccountError("");
    setShowDeleteAccount(true);
  };

  const handleCloseDeleteAccount = () => {
    if (deletingAccount) {
      return;
    }

    setShowDeleteAccount(false);
    setDeleteAccountPassword("");
    setDeleteAccountError("");
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();

    setDeleteAccountError("");

    if (!deleteAccountPassword) {
      setDeleteAccountError(
        "Please enter your current password to delete your account.",
      );

      return;
    }

    const token = localStorage.getItem("workmateToken");

    if (!token) {
      setDeleteAccountError(
        "Your session has expired. Please login again.",
      );

      return;
    }

    try {
      setDeletingAccount(true);

      const response = await fetch(`${API_URL}/api/auth/account`, {
        method: "DELETE",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          password: deleteAccountPassword,
        }),
      });

      const contentType =
        response.headers.get("content-type") || "";

      let data = {};

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        await response.text();

        throw new Error(
          "The server returned an unexpected response. Please try again.",
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to delete account.",
        );
      }

      localStorage.removeItem("workmateToken");
      localStorage.removeItem("workmateUser");
      localStorage.removeItem("workmateRememberEmail");

      setShowDeleteAccount(false);

      navigate("/");

      window.location.reload();
    } catch (error) {
      console.error(
        "Delete account error:",
        error,
      );

      if (error instanceof TypeError) {
        setDeleteAccountError(
          "Unable to connect to WorkMate. Please check your connection and try again.",
        );
      } else {
        setDeleteAccountError(
          error.message ||
            "Unable to delete your account. Please try again.",
        );
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  /* =========================================================
     MY PROFILE
  ========================================================= */

  const handleMyProfile = async () => {
    setShowAccountMenu(false);

    if (!user) {
      return;
    }

    /* EMPLOYER */

    if (user.role === "employer") {
      document.getElementById("employer-profile")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    /* WORKER */

    if (user.role !== "worker") {
      return;
    }

    const token = localStorage.getItem("workmateToken");

    if (!token) {
      handleLogout();

      return;
    }

    try {
      setOpeningProfile(true);

      const response = await fetch(
        `${API_URL}/api/workers/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          document
            .getElementById("register-worker")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });

          return;
        }

        throw new Error(
          data.message ||
            "Unable to load worker profile.",
        );
      }

      const workerProfile = data.worker;

      if (workerProfile?._id) {
        navigate(
          `/workers/${workerProfile._id}`,
        );

        return;
      }

      document
        .getElementById("register-worker")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    } catch (error) {
      console.error(
        "Open worker profile error:",
        error,
      );

      document
        .getElementById("register-worker")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    } finally {
      setOpeningProfile(false);
    }
  };

  /* =========================================================
     HOME SECTION NAVIGATION
  ========================================================= */

  const scrollToWorkers = () => {
    document
      .getElementById("find-workers")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const scrollToJobs = () => {
    const targetId =
      user?.role === "employer"
        ? "post-job"
        : "find-jobs";

    document
      .getElementById(targetId)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const scrollToReceivedRequests = () => {
    document
      .getElementById("received-requests")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  /* =========================================================
     POPULAR SKILL NAVIGATION
  ========================================================= */

  const openWorkersBySkill = (skill) => {
    window.dispatchEvent(
      new CustomEvent(
        "workmate:filter-workers",
        {
          detail: {
            skill,
          },
        },
      ),
    );

    window.setTimeout(() => {
      document
        .getElementById("find-workers")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="app">
      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="navbar">
        <div
          className="logo"
          onClick={() => navigate("/")}
          style={{
            cursor: "pointer",
          }}
        >
          <span>Work</span>
          Mate
        </div>

        {/* ===================================================
            NAV LINKS
        =================================================== */}

        <div className="nav-links">
          {/* GUEST */}

          {!user && (
            <>
              <a href="#find-workers">
                {t("findWorkers")}
              </a>

              <a href="#find-jobs">
                {t("findJobs")}
              </a>
            </>
          )}

          {/* EMPLOYER */}

          {user?.role === "employer" && (
            <>
              <a href="#find-workers">
                {t("findWorkers")}
              </a>

              <a href="#saved-workers">
                ♥ Saved Workers
              </a>

              <a href="#sent-requests">
                {t("myRequests")}

                <NavBadges
                  user={user}
                  type="requests"
                />
              </a>

              <a href="#my-jobs">
                {t("myJobs")}

                <NavBadges
                  user={user}
                  type="jobs"
                />
              </a>

              <a href="#employer-profile">
                {t("myProfile")}
              </a>

              <a href="#post-job">
                {t("postJob")}
              </a>
            </>
          )}

          {/* WORKER */}

          {user?.role === "worker" && (
            <>
              <a href="#find-jobs">
                {t("findJobs")}
              </a>

              <a href="#my-applications">
                {t("myApplications")}

                <NavBadges
                  user={user}
                  type="applications"
                />
              </a>

              <a href="#received-requests">
                {t("myRequests")}

                <NavBadges
                  user={user}
                  type="requests"
                />
              </a>
            </>
          )}

          <a href="#how">
            {t("howItWorks")}
          </a>

          <a href="#contact-us">
            Contact Us
          </a>
        </div>

        {/* ===================================================
            RIGHT NAV ACTIONS
        =================================================== */}

        <div className="nav-actions">
          {/* LANGUAGE */}

          <div className="language-switcher">
            <button
              type="button"
              className={
                language === "en"
                  ? "language-btn active"
                  : "language-btn"
              }
              onClick={() =>
                changeLanguage("en")
              }
            >
              English
            </button>

            <button
              type="button"
              className={
                language === "hi"
                  ? "language-btn active"
                  : "language-btn"
              }
              onClick={() =>
                changeLanguage("hi")
              }
            >
              हिंदी
            </button>
          </div>

          {/* =================================================
              LOGGED IN ACCOUNT
          ================================================= */}

          {user ? (
            <div
              style={{
                position: "relative",
              }}
            >
              <button
                type="button"
                className="logged-user"
                onClick={() =>
                  setShowAccountMenu(
                    (previous) =>
                      !previous,
                  )
                }
                aria-expanded={
                  showAccountMenu
                }
                aria-haspopup="menu"
                style={{
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <ProfileAvatar
                  person={user}
                  fallback={
                    user.role === "worker"
                      ? "👨‍🍳"
                      : user.role === "admin"
                        ? "🛡️"
                        : "💼"
                  }
                  className="logged-user-icon"
                  alt={user.name}
                />

                <div className="logged-user-info">
                  <strong>
                    {user.name}
                  </strong>

                  <small>
                    {user.role === "worker"
                      ? t("worker")
                      : user.role === "admin"
                        ? "Admin"
                        : t("employer")}
                  </small>
                </div>

                <span
                  style={{
                    marginLeft: "4px",
                    fontSize: "12px",
                    transition:
                      "transform 0.2s ease",
                    transform:
                      showAccountMenu
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                  }}
                >
                  ▾
                </span>
              </button>

              {/* =============================================
                  ACCOUNT DROPDOWN
              ============================================= */}

              {showAccountMenu && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    width: "230px",
                    background: "#ffffff",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: "14px",
                    boxShadow:
                      "0 18px 45px rgba(15, 23, 42, 0.14)",
                    padding: "8px",
                    zIndex: 3000,
                  }}
                >
                  {/* USER */}

                  <div
                    style={{
                      padding:
                        "10px 12px 12px",
                      borderBottom:
                        "1px solid #f1f5f9",
                      marginBottom: "6px",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: "14px",
                        color: "#1f2937",
                      }}
                    >
                      {user.name}
                    </strong>

                    <span
                      style={{
                        display: "block",
                        marginTop: "3px",
                        fontSize: "12px",
                        color: "#64748b",
                        overflow: "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {user.email}
                    </span>
                  </div>

                  {/* ACCOUNT SETTINGS */}

                  {user.role !==
                    "admin" && (
                    <button
                      type="button"
                      role="menuitem"
                      className="account-menu-item"
                      onClick={
                        handleOpenSettings
                      }
                    >
                      <span className="account-menu-item-icon">
                        ⚙️
                      </span>

                      <span>
                        Account Settings
                      </span>
                    </button>
                  )}

                  <div
                    style={{
                      height: "1px",
                      background:
                        "#f1f5f9",
                      margin: "6px 0",
                    }}
                  />

                  {/* LOGOUT */}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems:
                        "center",
                      gap: "10px",
                      border: "none",
                      background:
                        "transparent",
                      padding:
                        "11px 12px",
                      borderRadius:
                        "9px",
                      cursor: "pointer",
                      fontSize: "14px",
                      textAlign: "left",
                      color: "#b91c1c",
                    }}
                  >
                    <span>↪</span>

                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                className="login-btn"
                type="button"
                onClick={goToAuth}
              >
                {t("login")}
              </button>

              <button
                className="signup-btn"
                type="button"
                onClick={goToAuth}
              >
                {t("getStarted")}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* =====================================================
          ACCOUNT SETTINGS MODAL
          IMPORTANT: OUTSIDE NAV DROPDOWN
      ===================================================== */}

      {showSettings &&
        user &&
        user.role !== "admin" && (
          <div
            className="settings-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                handleCloseSettings();
              }
            }}
          >
            <div
              className="settings-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="account-settings-title"
            >
              {/* HEADER */}

              <div className="settings-header">
                <div>
                  <span className="settings-kicker">
                    ACCOUNT
                  </span>

                  <h2 id="account-settings-title">
                    Account Settings
                  </h2>

                  <p>
                    Manage your WorkMate
                    account and security.
                  </p>
                </div>

                <button
                  type="button"
                  className="settings-close"
                  onClick={
                    handleCloseSettings
                  }
                  aria-label="Close account settings"
                >
                  ×
                </button>
              </div>

              {/* ACCOUNT IDENTITY */}

              <div className="settings-user-card">
                <ProfileAvatar
                  person={user}
                  fallback={
                    user.role ===
                    "worker"
                      ? "👨‍🍳"
                      : "💼"
                  }
                  className="settings-avatar"
                  alt={user.name}
                />

                <div className="settings-user-info">
                  <strong>
                    {user.name}
                  </strong>

                  <span>
                    {user.email}
                  </span>

                  <small>
                    {user.role ===
                    "worker"
                      ? "Worker Account"
                      : "Employer Account"}
                  </small>
                </div>
              </div>

              {/* PROFILE */}

              <div className="settings-section">
                <span className="settings-section-title">
                  PROFILE
                </span>

                <button
                  type="button"
                  className="settings-action"
                  onClick={
                    handleSettingsProfile
                  }
                  disabled={
                    openingProfile
                  }
                >
                  <span className="settings-action-icon settings-profile-icon">
                    👤
                  </span>

                  <span className="settings-action-copy">
                    <strong>
                      My Profile
                    </strong>

                    <small>
                      {user.role ===
                      "worker"
                        ? "View and manage your worker profile."
                        : "Manage your employer and business details."}
                    </small>
                  </span>

                  <span className="settings-chevron">
                    ›
                  </span>
                </button>
              </div>

              {/* SECURITY */}

              <div className="settings-section">
                <span className="settings-section-title">
                  SECURITY
                </span>

                <button
                  type="button"
                  className="settings-action"
                  onClick={
                    handleSettingsPassword
                  }
                >
                  <span className="settings-action-icon settings-security-icon">
                    🔐
                  </span>

                  <span className="settings-action-copy">
                    <strong>
                      Change Password
                    </strong>

                    <small>
                      Update your WorkMate
                      account password.
                    </small>
                  </span>

                  <span className="settings-chevron">
                    ›
                  </span>
                </button>
              </div>

              {/* SESSION */}

              <div className="settings-section">
                <span className="settings-section-title">
                  SESSION
                </span>

                <button
                  type="button"
                  className="settings-action settings-logout-action"
                  onClick={
                    handleSettingsLogout
                  }
                >
                  <span className="settings-action-icon settings-logout-icon">
                    ↪
                  </span>

                  <span className="settings-action-copy">
                    <strong>
                      Logout
                    </strong>

                    <small>
                      Sign out of this
                      WorkMate session.
                    </small>
                  </span>

                  <span className="settings-chevron">
                    ›
                  </span>
                </button>
              </div>

              {/* DANGER ZONE */}

              <div className="settings-section">
                <span className="settings-section-title">
                  DANGER ZONE
                </span>

                <button
                  type="button"
                  className="settings-action"
                  onClick={
                    handleOpenDeleteAccount
                  }
                  style={{
                    borderColor:
                      "#fecaca",
                    background:
                      "#fff7f7",
                  }}
                >
                  <span
                    className="settings-action-icon"
                    style={{
                      background:
                        "#fee2e2",
                      color:
                        "#b91c1c",
                    }}
                  >
                    🗑️
                  </span>

                  <span className="settings-action-copy">
                    <strong
                      style={{
                        color:
                          "#b91c1c",
                      }}
                    >
                      Delete Account
                    </strong>

                    <small>
                      Permanently delete
                      your WorkMate account
                      and related account
                      data. This cannot be
                      undone.
                    </small>
                  </span>

                  <span
                    className="settings-chevron"
                    style={{
                      color:
                        "#b91c1c",
                    }}
                  >
                    ›
                  </span>
                </button>
              </div>

              {/* SECURITY NOTE */}

              <div className="settings-security-note">
                <span>🔒</span>

                <p>
                  Your password is never
                  displayed inside
                  WorkMate. Use Change
                  Password or Forgot
                  Password whenever you
                  need to update it.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          DELETE ACCOUNT MODAL
      ===================================================== */}

      {showDeleteAccount &&
        user &&
        user.role !== "admin" && (
          <div
            className="password-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                handleCloseDeleteAccount();
              }
            }}
          >
            <div
              className="password-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
            >
              <div className="password-modal-header">
                <div>
                  <span
                    className="password-modal-eyebrow"
                    style={{
                      color:
                        "#b91c1c",
                    }}
                  >
                    DANGER ZONE
                  </span>

                  <h2 id="delete-account-title">
                    Delete Account
                  </h2>

                  <p>
                    Permanently delete
                    your WorkMate
                    account. This action
                    cannot be undone.
                  </p>
                </div>

                <button
                  type="button"
                  className="password-modal-close"
                  onClick={
                    handleCloseDeleteAccount
                  }
                  disabled={
                    deletingAccount
                  }
                  aria-label="Close delete account"
                >
                  ×
                </button>
              </div>

              <form
                className="password-form"
                onSubmit={
                  handleDeleteAccount
                }
              >
                <div
                  className="settings-security-note"
                  style={{
                    borderColor:
                      "#fecaca",
                    background:
                      "#fff7f7",
                  }}
                >
                  <span>⚠️</span>

                  <p>
                    Deleting your account
                    removes your login
                    account and related
                    WorkMate account data.
                    If you sign up again
                    with the same email,
                    you will need to
                    verify that email
                    again.
                  </p>
                </div>

                <div className="password-field">
                  <label htmlFor="deleteAccountPassword">
                    Confirm your current
                    password
                  </label>

                  <input
                    id="deleteAccountPassword"
                    type="password"
                    value={
                      deleteAccountPassword
                    }
                    onChange={(
                      event,
                    ) => {
                      setDeleteAccountPassword(
                        event.target
                          .value,
                      );

                      if (
                        deleteAccountError
                      ) {
                        setDeleteAccountError(
                          "",
                        );
                      }
                    }}
                    autoComplete="current-password"
                    placeholder="Enter your current password"
                    disabled={
                      deletingAccount
                    }
                    required
                  />
                </div>

                {deleteAccountError && (
                  <div
                    className="password-message password-message-error"
                    role="alert"
                  >
                    <span>!</span>

                    <p>
                      {
                        deleteAccountError
                      }
                    </p>
                  </div>
                )}

                <div className="password-modal-actions">
                  <button
                    type="button"
                    className="password-cancel-btn"
                    onClick={
                      handleCloseDeleteAccount
                    }
                    disabled={
                      deletingAccount
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="password-submit-btn"
                    disabled={
                      deletingAccount ||
                      !deleteAccountPassword
                    }
                    style={{
                      background:
                        "#b91c1c",
                      borderColor:
                        "#b91c1c",
                    }}
                  >
                    {deletingAccount
                      ? "Deleting Account..."
                      : "Delete Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* =====================================================
          CHANGE PASSWORD MODAL
      ===================================================== */}

      {showPasswordForm && (
        <div
          className="password-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleClosePasswordForm();
            }
          }}
        >
          <div
            className="password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
          >
            {/* HEADER */}

            <div className="password-modal-header">
              <div>
                <span className="password-modal-eyebrow">
                  ACCOUNT SECURITY
                </span>

                <h2 id="change-password-title">
                  Change Password
                </h2>

                <p>
                  Update your WorkMate
                  account password.
                </p>
              </div>

              <button
                type="button"
                className="password-modal-close"
                onClick={
                  handleClosePasswordForm
                }
                disabled={
                  changingPassword
                }
                aria-label="Close change password"
              >
                ×
              </button>
            </div>

            {/* FORM */}

            <form
              className="password-form"
              onSubmit={
                handleChangePassword
              }
            >
              <div className="password-field">
                <label htmlFor="currentPassword">
                  Current Password
                </label>

                <input
                  id="currentPassword"
                  type="password"
                  name="currentPassword"
                  value={
                    passwordForm.currentPassword
                  }
                  onChange={
                    handlePasswordChange
                  }
                  autoComplete="current-password"
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="password-field">
                <label htmlFor="newPassword">
                  New Password
                </label>

                <input
                  id="newPassword"
                  type="password"
                  name="newPassword"
                  value={
                    passwordForm.newPassword
                  }
                  onChange={
                    handlePasswordChange
                  }
                  autoComplete="new-password"
                  placeholder="Enter new password"
                  minLength="6"
                  required
                />

                <small>
                  Use at least 6
                  characters.
                </small>
              </div>

              <div className="password-field">
                <label htmlFor="confirmPassword">
                  Confirm New Password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={
                    passwordForm.confirmPassword
                  }
                  onChange={
                    handlePasswordChange
                  }
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                  minLength="6"
                  required
                />
              </div>

              {/* ERROR */}

              {passwordError && (
                <div
                  className="password-message password-message-error"
                  role="alert"
                >
                  <span>!</span>

                  <p>
                    {passwordError}
                  </p>
                </div>
              )}

              {/* SUCCESS */}

              {passwordMessage && (
                <div
                  className="password-message password-message-success"
                  role="status"
                >
                  <span>✓</span>

                  <p>
                    {passwordMessage}
                  </p>
                </div>
              )}

              {/* ACTIONS */}

              <div className="password-modal-actions">
                <button
                  type="button"
                  className="password-cancel-btn"
                  onClick={
                    handleClosePasswordForm
                  }
                  disabled={
                    changingPassword
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="password-submit-btn"
                  disabled={
                    changingPassword
                  }
                >
                  {changingPassword
                    ? "Changing..."
                    : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main>
        {/* ===================================================
            HERO
        =================================================== */}

        <section className="hero">
          <div className="hero-glow glow-one"></div>

          <div className="hero-glow glow-two"></div>

          <div className="hero-content">
            <div className="badge">
              <span className="pulse-dot"></span>

              {t("heroBadge")}
            </div>

            <h1>
              {t("heroTitleStart")}

              <span>
                {" "}
                {t(
                  "heroTitleHighlight",
                )}
              </span>

              <br />

              {t("heroTitleEnd")}
            </h1>

            <p>
              {t(
                "heroDescription",
              )}
            </p>

            {/* BUTTONS */}

            <div className="hero-buttons">
              <button
                className="primary-btn"
                type="button"
                onClick={
                  user?.role ===
                  "worker"
                    ? scrollToJobs
                    : scrollToWorkers
                }
              >
                {user?.role ===
                "worker"
                  ? t("findAJob")
                  : t(
                      "findAWorker",
                    )}{" "}
                <span>→</span>
              </button>

              <button
                className="secondary-btn"
                type="button"
                onClick={
                  user?.role ===
                  "worker"
                    ? scrollToReceivedRequests
                    : scrollToJobs
                }
              >
                {user?.role ===
                "worker"
                  ? t(
                      "myRequests",
                    )
                  : user?.role ===
                      "employer"
                    ? t("postJob")
                    : t(
                        "findAJob",
                      )}{" "}
                <span>→</span>
              </button>
            </div>

            {/* TRUST */}

            <div className="trust-row">
              <div className="avatars">
                <div>👨‍🍳</div>

                <div>👩‍🍳</div>

                <div>🍰</div>

                <div>🍬</div>
              </div>

              <div>
                <strong>
                  {t(
                    "skilledPeople",
                  )}
                </strong>

                <small>
                  {t(
                    "builtForLocal",
                  )}
                </small>
              </div>
            </div>
          </div>

          {/* =================================================
              HERO VISUAL
          ================================================= */}

          <div className="hero-visual">
            <div className="floating-card card-one">
              <div className="mini-icon">
                🍰
              </div>

              <div>
                <strong>
                  {t(
                    "expertBaker",
                  )}
                </strong>

                <small>
                  {t(
                    "threeYearsExperience",
                  )}
                </small>
              </div>

              <span className="verified">
                ✓
              </span>
            </div>

            <div className="worker-card">
              <div className="worker-image">
                👨‍🍳
              </div>

              <div className="worker-info">
                <div className="worker-top">
                  <div>
                    <h3>
                      {t(
                        "skilledWorker",
                      )}
                    </h3>

                    <p>
                      {t(
                        "bakeryFastFood",
                      )}
                    </p>
                  </div>

                  <span className="online-dot"></span>
                </div>

                <div className="skills">
                  <span>
                    🍕{" "}
                    {t("pizza")}
                  </span>

                  <span>
                    🍔{" "}
                    {t(
                      "burger",
                    )}
                  </span>

                  <span>
                    🍰{" "}
                    {t(
                      "bakery",
                    )}
                  </span>
                </div>

                <div className="worker-details">
                  <span>
                    📍{" "}
                    {t(
                      "nearby",
                    )}
                  </span>

                  <span>
                    ⭐{" "}
                    {t(
                      "verified",
                    )}
                  </span>

                  <span>
                    ✓{" "}
                    {t(
                      "available",
                    )}
                  </span>
                </div>

                <button
                  className="profile-btn"
                  type="button"
                  onClick={
                    user?.role ===
                    "worker"
                      ? scrollToJobs
                      : scrollToWorkers
                  }
                >
                  {user?.role ===
                  "worker"
                    ? t(
                        "viewJobs",
                      )
                    : t(
                        "viewWorkers",
                      )}{" "}
                  →
                </button>
              </div>
            </div>

            <div className="floating-card card-two">
              <span className="match-icon">
                ⚡
              </span>

              <div>
                <strong>
                  {t(
                    "smartMatch",
                  )}
                </strong>

                <small>
                  {t(
                    "findRightSkills",
                  )}
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================
            POPULAR SKILLS
        =================================================== */}

        <section
          className="categories"
          id="how"
        >
          <div className="section-heading">
            <span>
              {t(
                "popularSkills",
              )}
            </span>

            <h2>
              {t(
                "skillsHeading",
              )}
            </h2>
          </div>

          <div className="category-grid">
            {/* CHEF */}

            <button
              type="button"
              className="category-card category-card-button"
              onClick={() =>
                openWorkersBySkill(
                  "chef",
                )
              }
            >
              <div>
                👨‍🍳
              </div>

              <h3>
                {t(
                  "chefCook",
                )}
              </h3>

              <p>
                {t(
                  "chefCookDescription",
                )}
              </p>
            </button>

            {/* BAKER */}

            <button
              type="button"
              className="category-card category-card-button"
              onClick={() =>
                openWorkersBySkill(
                  "baker",
                )
              }
            >
              <div>🍰</div>

              <h3>
                {t(
                  "baker",
                )}
              </h3>

              <p>
                {t(
                  "bakerDescription",
                )}
              </p>
            </button>

            {/* FAST FOOD */}

            <button
              type="button"
              className="category-card category-card-button"
              onClick={() =>
                openWorkersBySkill(
                  "fast-food",
                )
              }
            >
              <div>🍕</div>

              <h3>
                {t(
                  "fastFood",
                )}
              </h3>

              <p>
                {t(
                  "fastFoodDescription",
                )}
              </p>
            </button>

            {/* HALWAI */}

            <button
              type="button"
              className="category-card category-card-button"
              onClick={() =>
                openWorkersBySkill(
                  "halwai",
                )
              }
            >
              <div>🍬</div>

              <h3>
                {t(
                  "halwai",
                )}
              </h3>

              <p>
                {t(
                  "halwaiDescription",
                )}
              </p>
            </button>
          </div>
        </section>

        {/* ===================================================
            DASHBOARD
        =================================================== */}

        {user &&
          user.role !==
            "admin" && (
            <DashboardSummary
              user={user}
            />
          )}

        {/* ===================================================
            GUEST
        =================================================== */}

        {!user && (
          <>
            <FindWorker />

            <FindJobs />
          </>
        )}

        {/* ===================================================
            EMPLOYER
        =================================================== */}

        {user?.role ===
          "employer" && (
          <>
            <FindWorker />

            <SavedWorkers />

            <SentRequests />

            <MyJobs />

            <JobPosting />
          </>
        )}

        {/* ===================================================
            WORKER
        =================================================== */}

        {user?.role ===
          "worker" && (
          <>
            <FindWorker />

            <FindJobs />

            <MyApplications />

            <ReceivedRequests />

            <WorkerRegistration />
          </>
        )}

        {/* ===================================================
            BOTTOM CTA
        =================================================== */}

        {user?.role !==
          "admin" && (
          <section
            className="cta-section"
            id="jobs"
          >
            <div>
              <span>
                {t(
                  "readyToGetStarted",
                )}
              </span>

              <h2>
                {t(
                  "nextOpportunity",
                )}
              </h2>
            </div>

            {user ? (
              <button
                className="primary-btn"
                type="button"
                onClick={
                  user.role ===
                  "employer"
                    ? scrollToWorkers
                    : scrollToJobs
                }
              >
                {user.role ===
                "employer"
                  ? t(
                      "exploreWorkers",
                    )
                  : t(
                      "exploreJobs",
                    )}{" "}
                <span>→</span>
              </button>
            ) : (
              <button
                className="primary-btn"
                type="button"
                onClick={
                  goToAuth
                }
              >
                {t(
                  "getStarted",
                )}{" "}
                <span>→</span>
              </button>
            )}
          </section>
        )}

        {/* ===================================================
            EMPLOYER PROFILE
        =================================================== */}

        {user?.role ===
          "employer" && (
          <EmployerProfile
            user={user}
          />
        )}

        {/* ===================================================
            CONTACT US
        =================================================== */}

        {user?.role !==
          "admin" && (
          <ContactUs />
        )}
      </main>
    </div>
  );
}

/* =========================================================
   MAIN APP ROUTES
========================================================= */

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/auth"
            element={<Auth />}
          />

          <Route
            path="/verify-email"
            element={
              <VerifyEmail />
            }
          />

          <Route
            path="/reset-password"
            element={
              <ResetPassword />
            }
          />

          <Route
            path="/admin/login"
            element={
              <AdminLogin />
            }
          />

          <Route
            path="/admin/workers"
            element={
              <AdminDirectory type="workers" />
            }
          />

          <Route
            path="/admin/employers"
            element={
              <AdminDirectory type="employers" />
            }
          />

          <Route
            path="/admin/messages"
            element={
              <AdminMessages />
            }
          />

          <Route
            path="/workers/:id"
            element={
              <WorkerProfile />
            }
          />

          <Route
            path="*"
            element={
              <HomePage />
            }
          />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;