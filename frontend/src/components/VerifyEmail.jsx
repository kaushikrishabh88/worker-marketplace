import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

const API_URL = "http://localhost:5000";

function VerifyEmail() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const [status, setStatus] =
    useState("verifying");

  const [message, setMessage] =
    useState(
      "Please wait while we verify your email.",
    );

  useEffect(() => {
    let cancelled = false;

    const verifyEmail = async () => {
      const token =
        searchParams.get("token");

      if (!token) {
        setStatus("error");

        setMessage(
          "Verification token is missing.",
        );

        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
        );

        const data =
          await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Email verification failed.",
          );
        }

        setStatus("success");

        setMessage(
          data.message ||
            "Your email has been verified successfully.",
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Verify email error:",
          error,
        );

        setStatus("error");

        setMessage(
          error.message ||
            "Unable to verify your email.",
        );
      }
    };

    verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <section className="verify-email-page">
      <div className="verify-email-card">
        <div className="verify-email-brand">
          <strong>
            Work<span>Mate</span>
          </strong>

          <small>
            EMAIL VERIFICATION
          </small>
        </div>

        <div
          className={`verify-email-icon verify-email-icon-${status}`}
        >
          {status === "verifying"
            ? "⏳"
            : status === "success"
              ? "✓"
              : "!"}
        </div>

        <h1>
          {status === "verifying"
            ? "Verifying your email..."
            : status === "success"
              ? "Email Verified!"
              : "Verification Failed"}
        </h1>

        <p>{message}</p>

        {status === "success" && (
          <>
            <div className="verify-email-success-note">
              Your WorkMate account is
              now active. You can sign in
              using your email and
              password.
            </div>

            <button
              type="button"
              className="verify-email-primary"
              onClick={() =>
                navigate("/auth")
              }
            >
              Continue to Login →
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="verify-email-error-note">
              The link may have expired or
              already been used.
            </div>

            <button
              type="button"
              className="verify-email-primary"
              onClick={() =>
                navigate("/auth")
              }
            >
              Back to WorkMate
            </button>
          </>
        )}

        {status === "verifying" && (
          <div className="verify-email-loader">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        <button
          type="button"
          className="verify-email-home"
          onClick={() =>
            navigate("/")
          }
        >
          ← Back to Home
        </button>
      </div>
    </section>
  );
}

export default VerifyEmail;
