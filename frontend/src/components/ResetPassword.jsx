import { useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

function ResetPassword() {
  const navigate =
    useNavigate();

  const [searchParams] =
    useSearchParams();

  const token =
    searchParams.get("token") || "";

  const [formData, setFormData] =
    useState({
      newPassword: "",
      confirmPassword: "",
    });

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError(
        "Password reset link is invalid.",
      );

      return;
    }

    if (
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      setError(
        "Please fill in both password fields.",
      );

      return;
    }

    if (
      formData.newPassword.length < 6
    ) {
      setError(
        "Password must be at least 6 characters.",
      );

      return;
    }

    if (
      formData.newPassword !==
      formData.confirmPassword
    ) {
      setError(
        "New password and confirm password do not match.",
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await fetch(
          "http://localhost:5000/api/auth/reset-password",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              token,

              newPassword:
                formData.newPassword,

              confirmPassword:
                formData.confirmPassword,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to reset password.",
        );
      }

      setSuccess(
        data.message ||
          "Password reset successfully.",
      );

      setFormData({
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error(
        "Reset password error:",
        error,
      );

      setError(
        error.message ||
          "Unable to reset password.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="reset-password-page">
      <div className="reset-password-card">
        <button
          type="button"
          className="reset-password-back"
          onClick={() =>
            navigate("/")
          }
        >
          ← Back to Home
        </button>

        <div className="reset-password-logo">
          <span>
            Work
          </span>
          Mate
        </div>

        <div className="reset-password-security-icon">
          🔐
        </div>

        <span className="reset-password-kicker">
          ACCOUNT SECURITY
        </span>

        <h1>
          Set New Password
        </h1>

        <p className="reset-password-copy">
          Create a new password for
          your WorkMate account.
        </p>

        {!token ? (
          <>
            <div className="reset-password-message reset-password-error">
              <span>
                !
              </span>

              <p>
                This password reset
                link is invalid.
              </p>
            </div>

            <button
              type="button"
              className="reset-password-submit"
              onClick={() =>
                navigate("/auth")
              }
            >
              Return to Login →
            </button>
          </>
        ) : success ? (
          <div className="reset-password-complete">
            <div className="reset-password-complete-icon">
              ✓
            </div>

            <h2>
              Password updated
            </h2>

            <p>
              {success}
            </p>

            <button
              type="button"
              className="reset-password-submit"
              onClick={() =>
                navigate("/auth")
              }
            >
              Go to Login →
            </button>
          </div>
        ) : (
          <form
            className="reset-password-form"
            onSubmit={
              handleSubmit
            }
          >
            <div className="reset-password-field">
              <label htmlFor="new-password">
                New Password
              </label>

              <div className="reset-password-input-wrap">
                <input
                  id="new-password"
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  name="newPassword"
                  value={
                    formData.newPassword
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Minimum 6 characters"
                  minLength="6"
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowNewPassword(
                      (previous) =>
                        !previous,
                    )
                  }
                  aria-label={
                    showNewPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showNewPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </div>

            <div className="reset-password-field">
              <label htmlFor="confirm-password">
                Confirm New Password
              </label>

              <div className="reset-password-input-wrap">
                <input
                  id="confirm-password"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  name="confirmPassword"
                  value={
                    formData.confirmPassword
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Re-enter new password"
                  minLength="6"
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) =>
                        !previous,
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showConfirmPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </div>

            {error && (
              <div className="reset-password-message reset-password-error">
                <span>
                  !
                </span>

                <p>
                  {error}
                </p>
              </div>
            )}

            <div className="reset-password-tip">
              🔒 Choose a password
              you don't use elsewhere.
            </div>

            <button
              className="reset-password-submit"
              type="submit"
              disabled={
                loading
              }
            >
              {loading
                ? "Updating Password..."
                : "Set New Password →"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export default ResetPassword;