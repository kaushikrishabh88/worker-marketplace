import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./useToast";
import API_URL from "../api";

function JobPosting() {
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    title: "",
    skill: "",
    location: "",
    salary: "",
    jobType: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);

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
     RESET FORM
  ========================================================= */

  const resetForm = () => {
    setFormData({
      title: "",
      skill: "",
      location: "",
      salary: "",
      jobType: "",
      description: "",
    });
  };

  /* =========================================================
     POST JOB
  ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    const token =
      localStorage.getItem("workmateToken");

    let user = null;

    try {
      const storedUser =
        localStorage.getItem("workmateUser");

      if (storedUser) {
        user = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error(
        "Unable to read logged-in user:",
        error
      );

      toast.error(
        "Unable to verify your account."
      );

      return;
    }

    if (!token || !user) {
      toast.warning(
        "Please login before posting a job."
      );

      navigate("/auth");

      return;
    }

    if (user.role !== "employer") {
      toast.warning(
        "Only employer accounts can post jobs."
      );

      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/jobs`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            title:
              formData.title.trim(),

            skill:
              formData.skill,

            location:
              formData.location.trim(),

            salary:
              Number(formData.salary),

            jobType:
              formData.jobType,

            description:
              formData.description.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to post job."
        );
      }

      resetForm();

      window.dispatchEvent(
        new Event(
          "workmate-badges-refresh"
        )
      );

      toast.success(
        "Job posted successfully!"
      );
    } catch (error) {
      console.error(
        "Job posting error:",
        error
      );

      toast.error(
        error.message ||
          "Something went wrong while posting the job."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="job-posting"
      id="post-job"
    >
      <div className="job-posting-heading">
        <span>
          HIRE LOCAL TALENT
        </span>

        <h2>
          Post a job and find the right worker.
        </h2>

        <p>
          Tell workers what you need and connect
          with skilled local talent.
        </p>
      </div>

      <form
        className="job-posting-form"
        onSubmit={handleSubmit}
      >
        <div className="form-group">
          <label htmlFor="job-title">
            Job Title
          </label>

          <input
            id="job-title"
            type="text"
            name="title"
            placeholder="Example: Bakery Chef Required"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="job-skill">
            Required Skill
          </label>

          <select
            id="job-skill"
            name="skill"
            value={formData.skill}
            onChange={handleChange}
            required
          >
            <option value="">
              Select required skill
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

        <div className="form-group">
          <label htmlFor="job-location">
            Job Location
          </label>

          <input
            id="job-location"
            type="text"
            name="location"
            placeholder="City / Area"
            value={formData.location}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="job-salary">
            Monthly Salary (₹)
          </label>

          <input
            id="job-salary"
            type="number"
            name="salary"
            min="0"
            placeholder="Example: 25000"
            value={formData.salary}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="job-type">
            Job Type
          </label>

          <select
            id="job-type"
            name="jobType"
            value={formData.jobType}
            onChange={handleChange}
            required
          >
            <option value="">
              Select job type
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

        <div className="form-group form-group-full">
          <label htmlFor="job-description">
            Job Description
          </label>

          <textarea
            id="job-description"
            name="description"
            rows="5"
            placeholder="Describe the work, responsibilities and requirements..."
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <button
          className="job-posting-submit"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Posting Job..."
            : "Post Job →"}
        </button>
      </form>
    </section>
  );
}

export default JobPosting;