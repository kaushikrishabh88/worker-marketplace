import { useState } from "react";
import { useToast } from "./useToast";
import API_URL from "../api";

function ContactUs() {
  const toast = useToast();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    userType: "employer",
    subject: "",
    message: "",
  });

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
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.userType ||
      !formData.subject.trim() ||
      !formData.message.trim()
    ) {
      toast.warning("Please complete all contact fields.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/contact`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          userType: formData.userType,
          subject: formData.subject.trim(),
          message: formData.message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to send your message.",
        );
      }

      toast.success(
        data.message ||
          "Thanks for contacting WorkMate. We will get back to you soon.",
      );

      setFormData({
        name: "",
        email: "",
        phone: "",
        userType: "employer",
        subject: "",
        message: "",
      });
    } catch (error) {
      console.error("Contact form error:", error);

      toast.error(
        error.message ||
          "Unable to send your message right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contact-us" id="contact-us">
      <div className="contact-us-inner">
        <div className="contact-us-info">
          <span className="contact-us-eyebrow">
            CONTACT WORKMATE
          </span>

          <h2>
            Need help?
            <br />
            We are here for you.
          </h2>

          <p className="contact-us-intro">
            Whether you are hiring skilled workers or looking for
            opportunities, send us your question and the WorkMate team
            will help you.
          </p>

          <div className="contact-us-divider"></div>

          <div className="contact-us-points">
            <div>
              <span>✓</span>

              <p>
                <strong>Hiring support</strong>
                Get help finding Chef, Baker, Fast Food and Halwai workers.
              </p>
            </div>

            <div>
              <span>✓</span>

              <p>
                <strong>Worker support</strong>
                Get help with profiles, applications and hiring requests.
              </p>
            </div>

            <div>
              <span>✓</span>

              <p>
                <strong>Account & platform help</strong>
                Tell us about login, profile or technical problems.
              </p>
            </div>
          </div>

          <div className="contact-us-skills" aria-hidden="true">
            <span>👨‍🍳</span>
            <span>🍰</span>
            <span>🍕</span>
            <span>🍬</span>
          </div>
        </div>

        <div className="contact-us-card">
          <span className="contact-us-form-label">
            SEND A MESSAGE
          </span>

          <h3>Get in touch with us.</h3>

          <p>
            Fill in the form and tell us how we can help.
          </p>

          <form onSubmit={handleSubmit}>
            <label>
              <span>Full Name *</span>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </label>

            <label>
              <span>Email Address *</span>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </label>

            <div className="contact-us-form-grid">
              <label>
                <span>Phone Number *</span>

                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Your phone number"
                  required
                />
              </label>

              <label>
                <span>I am a *</span>

                <select
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                  required
                >
                  <option value="employer">
                    💼 Employer
                  </option>

                  <option value="worker">
                    👨‍🍳 Worker
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </label>
            </div>

            <label>
              <span>Subject *</span>

              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select a topic
                </option>

                <option value="Hiring help">
                  Hiring help
                </option>

                <option value="Worker profile help">
                  Worker profile help
                </option>

                <option value="Job posting issue">
                  Job posting issue
                </option>

                <option value="Application or request issue">
                  Application / request issue
                </option>

                <option value="Account issue">
                  Account issue
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </label>

            <label>
              <span>Message *</span>

              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Tell us how we can help..."
                rows="6"
                maxLength="1500"
                required
              />

              <small>
                {formData.message.length}/1500
              </small>
            </label>

            <button
              type="submit"
              className="contact-us-submit"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Message →"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default ContactUs;