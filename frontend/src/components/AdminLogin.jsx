import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./useToast";
import API_URL from "../api";

function AdminLogin() {
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !formData.email.trim() ||
      !formData.password
    ) {
      toast.warning(
        "Please enter your admin email and password.",
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Admin login failed.",
        );
      }

      if (data.user?.role !== "admin") {
        throw new Error(
          "This account does not have admin access.",
        );
      }

      localStorage.setItem(
        "workmateToken",
        data.token,
      );

      localStorage.setItem(
        "workmateUser",
        JSON.stringify(data.user),
      );

      toast.success("Admin login successful.");

      navigate("/admin/messages");
    } catch (error) {
      console.error("Admin login error:", error);

      toast.error(
        error.message ||
          "Unable to login as admin.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="admin-login-page">
      <div className="admin-login-card">
        <button
          type="button"
          className="admin-login-back"
          onClick={() => navigate("/")}
        >
          ← Back to WorkMate
        </button>

        <div className="admin-login-brand">
          <div className="admin-login-logo">
            W
          </div>

          <div>
            <strong>
              Work<span>Mate</span>
            </strong>

            <small>ADMIN PORTAL</small>
          </div>
        </div>

        <div className="admin-login-heading">
          <span>SECURE ACCESS</span>

          <h1>Admin Login</h1>

          <p>
            Sign in to review WorkMate contact
            queries and manage their status.
          </p>
        </div>

        <form
          className="admin-login-form"
          onSubmit={handleSubmit}
        >
          <label>
            <span>Email Address</span>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Admin email"
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Password</span>

            <div className="admin-password-wrap">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (previous) => !previous,
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          <button
            className="admin-login-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Open Admin Dashboard →"}
          </button>
        </form>

        <div className="admin-login-security">
          🔒 Admin-only WorkMate area
        </div>
      </div>
    </section>
  );
}

export default AdminLogin;