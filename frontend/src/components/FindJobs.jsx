import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useToast } from "./useToast";
import ProfileAvatar from "./ProfileAvatar";

function FindJobs() {
  const toast = useToast();

  const [jobs, setJobs] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    selectedSkill,
    setSelectedSkill,
  ] = useState("");

  const [
    selectedLocation,
    setSelectedLocation,
  ] = useState("");

  const [
    selectedJob,
    setSelectedJob,
  ] = useState(null);

  const [applying, setApplying] =
    useState(false);

  const [
    appliedJobIds,
    setAppliedJobIds,
  ] = useState([]);

  /* =========================================================
     FETCH JOBS
  ========================================================= */

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://localhost:5000/api/jobs"
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to load jobs."
          );
        }

        setJobs(
          data.jobs || []
        );
      } catch (error) {
        console.error(
          "Fetch jobs error:",
          error
        );

        setError(
          error.message ||
            "Unable to load jobs."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  /* =========================================================
     FILTER JOBS
  ========================================================= */

  const filteredJobs = useMemo(() => {
    const search =
      searchTerm
        .trim()
        .toLowerCase();

    return jobs.filter((job) => {
      const title =
        job.title
          ?.toLowerCase() || "";

      const skill =
        job.skill
          ?.toLowerCase() || "";

      const location =
        job.location
          ?.toLowerCase() || "";

      const employerName =
        job.employer
          ?.name
          ?.toLowerCase() || "";

      const matchesSearch =
        !search ||
        title.includes(search) ||
        skill.includes(search) ||
        location.includes(search) ||
        employerName.includes(
          search
        );

      const matchesSkill =
        !selectedSkill ||
        skill ===
          selectedSkill.toLowerCase();

      const matchesLocation =
        !selectedLocation ||
        location.includes(
          selectedLocation.toLowerCase()
        );

      return (
        matchesSearch &&
        matchesSkill &&
        matchesLocation
      );
    });
  }, [
    jobs,
    searchTerm,
    selectedSkill,
    selectedLocation,
  ]);

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSkill("");
    setSelectedLocation("");
  };

  /* =========================================================
     OPEN / CLOSE JOB
  ========================================================= */

  const openJob = (job) => {
    setSelectedJob(job);
  };

  const closeJob = () => {
    if (applying) {
      return;
    }

    setSelectedJob(null);
  };

  /* =========================================================
     APPLY FOR JOB
  ========================================================= */

  const handleApplyJob = async () => {
    if (!selectedJob?._id) {
      return;
    }

    const token =
      localStorage.getItem(
        "workmateToken"
      );

    let user = null;

    try {
      const storedUser =
        localStorage.getItem(
          "workmateUser"
        );

      if (storedUser) {
        user =
          JSON.parse(storedUser);
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
        "Please login as a worker before applying."
      );

      return;
    }

    if (user.role !== "worker") {
      toast.warning(
        "Only worker accounts can apply for jobs."
      );

      return;
    }

    try {
      setApplying(true);

      const response = await fetch(
        `http://localhost:5000/api/jobs/${selectedJob._id}/apply`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to apply for job."
        );
      }

      setAppliedJobIds(
        (previous) =>
          previous.includes(
            selectedJob._id
          )
            ? previous
            : [
                ...previous,
                selectedJob._id,
              ]
      );

      window.dispatchEvent(
        new Event(
          "workmate-badges-refresh"
        )
      );

      toast.success(
        "Application submitted successfully!"
      );
    } catch (error) {
      console.error(
        "Apply job error:",
        error
      );

      toast.error(
        error.message ||
          "Unable to submit application."
      );
    } finally {
      setApplying(false);
    }
  };

  const selectedJobApplied =
    selectedJob
      ? appliedJobIds.includes(
          selectedJob._id
        )
      : false;

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section
      className="find-jobs"
      id="find-jobs"
    >
      <div className="find-jobs-heading">
        <span>
          LOCAL JOB OPPORTUNITIES
        </span>

        <h2>
          Find your next opportunity near you.
        </h2>

        <p>
          Browse jobs posted by local businesses
          and find work that matches your skills.
        </p>
      </div>

      {/* =====================================================
          SEARCH PANEL
      ===================================================== */}

      <div className="job-search-panel">
        <div className="job-search-field job-search-main">
          <label>
            Search Jobs
          </label>

          <input
            type="text"
            placeholder="Job title, skill or business..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
          />
        </div>

        <div className="job-search-field">
          <label>
            Skill
          </label>

          <select
            value={selectedSkill}
            onChange={(event) =>
              setSelectedSkill(
                event.target.value
              )
            }
          >
            <option value="">
              All Skills
            </option>

            <option value="chef">
              Chef / Cook
            </option>

            <option value="baker">
              Baker
            </option>

            <option value="fast-food">
              Fast Food
            </option>

            <option value="halwai">
              Halwai
            </option>

            <option value="helper">
              Helper
            </option>
          </select>
        </div>

        <div className="job-search-field">
          <label>
            Location
          </label>

          <input
            type="text"
            placeholder="City / Area"
            value={selectedLocation}
            onChange={(event) =>
              setSelectedLocation(
                event.target.value
              )
            }
          />
        </div>
      </div>

      {/* =====================================================
          RESULTS HEADER
      ===================================================== */}

      <div className="job-results-header">
        <div>
          <span>
            JOB DIRECTORY
          </span>

          <h3>
            Available Jobs (
            {loading
              ? "..."
              : filteredJobs.length}
            )
          </h3>

          <p>
            Explore opportunities matching your
            skills.
          </p>
        </div>

        {(searchTerm ||
          selectedSkill ||
          selectedLocation) && (
          <button
            type="button"
            className="clear-job-filters"
            onClick={clearFilters}
          >
            Clear Filters ↻
          </button>
        )}
      </div>

      {/* =====================================================
          JOB LIST
      ===================================================== */}

      <div className="job-list">
        {loading ? (
          <div className="job-empty-state">
            <div className="job-empty-icon">
              ⏳
            </div>

            <h3>
              Loading jobs...
            </h3>

            <p>
              Please wait while we load available
              opportunities.
            </p>
          </div>
        ) : error ? (
          <div className="job-empty-state">
            <div className="job-empty-icon">
              ⚠️
            </div>

            <h3>
              Unable to load jobs
            </h3>

            <p>
              {error}
            </p>
          </div>
        ) : filteredJobs.length ===
          0 ? (
          <div className="job-empty-state">
            <div className="job-empty-icon">
              🔎
            </div>

            <h3>
              No jobs found
            </h3>

            <p>
              Try changing your search or filters.
            </p>

            <button
              type="button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <article
              className="job-card"
              key={job._id}
            >
              <div className="job-card-top">
                <ProfileAvatar
  person={job.employer}
  fallback="🏢"
  className="job-company-icon"
  alt={
    job.employer?.name ||
    "Employer"
  }
/>

                <div>
                  <span className="job-open-badge">
                    OPEN
                  </span>

                  <h3>
                    {job.title}
                  </h3>

                  <p className="job-employer">
                    Posted by{" "}
                    <strong>
                      {job.employer
                        ?.name ||
                        "Local Business"}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="job-card-tags">
                <span>
                  🛠 {job.skill}
                </span>

                <span>
                  📍 {job.location}
                </span>

                <span>
                  🕒 {job.jobType}
                </span>
              </div>

              {job.description && (
                <p className="job-card-description">
                  {job.description}
                </p>
              )}

              <div className="job-card-bottom">
                <div className="job-salary">
                  <small>
                    Monthly Salary
                  </small>

                  <strong>
                    ₹
                    {Number(
                      job.salary || 0
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openJob(job)
                  }
                >
                  View Job →
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* =====================================================
          JOB DETAILS MODAL
      ===================================================== */}

      {selectedJob && (
        <div
          className="job-details-overlay"
          onClick={closeJob}
        >
          <div
            className="job-details-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="job-details-close"
              type="button"
              onClick={closeJob}
              disabled={applying}
            >
              ×
            </button>

            <span className="job-details-label">
              JOB OPPORTUNITY
            </span>

            <h2>
              {selectedJob.title}
            </h2>

            <p className="job-details-company">
              Posted by{" "}
              <strong>
                {selectedJob.employer
                  ?.name ||
                  "Local Business"}
              </strong>
            </p>

            <div className="job-details-meta">
              <span>
                🛠 {selectedJob.skill}
              </span>

              <span>
                📍 {selectedJob.location}
              </span>

              <span>
                🕒 {selectedJob.jobType}
              </span>
            </div>

            <div className="job-details-salary">
              <small>
                Monthly Salary
              </small>

              <strong>
                ₹
                {Number(
                  selectedJob.salary ||
                    0
                ).toLocaleString(
                  "en-IN"
                )}
              </strong>
            </div>

            <div className="job-details-description">
              <h3>
                Job Description
              </h3>

              <p>
                {selectedJob.description ||
                  "No additional job description provided."}
              </p>
            </div>

            <button
              className="job-apply-btn"
              type="button"
              onClick={handleApplyJob}
              disabled={
                applying ||
                selectedJobApplied
              }
            >
              {applying
                ? "Applying..."
                : selectedJobApplied
                  ? "Applied ✓"
                  : "Apply for this Job →"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default FindJobs;