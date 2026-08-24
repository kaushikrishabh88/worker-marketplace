import { useEffect, useState } from "react";
import { useToast } from "./useToast";
import ProfileAvatar from "./ProfileAvatar";
import API_URL from "../api";

function MyJobs() {
  const toast = useToast();

  const token = localStorage.getItem("workmateToken");

  const [jobs, setJobs] = useState([]);

  const [loading, setLoading] = useState(Boolean(token));

  const [error, setError] = useState(
    token ? "" : "Please login as an employer to view your jobs.",
  );

  const [selectedJob, setSelectedJob] = useState(null);

  const [applications, setApplications] = useState([]);

  const [applicationsLoading, setApplicationsLoading] = useState(false);

  const [applicationsError, setApplicationsError] = useState("");

  const [updatingApplicationId, setUpdatingApplicationId] = useState("");

  const [updatingJobId, setUpdatingJobId] = useState("");

  const [deletingJobId, setDeletingJobId] = useState("");

  const [editingJob, setEditingJob] = useState(null);

  const [editForm, setEditForm] = useState({
    title: "",
    skill: "",
    location: "",
    salary: "",
    jobType: "",
    description: "",
  });

  const [savingEdit, setSavingEdit] = useState(false);

  const [editError, setEditError] = useState("");

  /* =========================================================
     FETCH MY JOBS
  ========================================================= */

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchMyJobs = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/jobs/my`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load your jobs.",
          );
        }

        setJobs(data.jobs || []);
      } catch (error) {
        console.error("Fetch my jobs error:", error);

        setError(
          error.message || "Unable to load your jobs.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMyJobs();
  }, [token]);

  /* =========================================================
     VIEW APPLICANTS
  ========================================================= */

  const handleViewApplicants = async (job) => {
    setSelectedJob(job);
    setApplications([]);
    setApplicationsError("");

    try {
      setApplicationsLoading(true);

      const response = await fetch(
        `${API_URL}/api/jobs/${job._id}/applications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load applicants.",
        );
      }

      setApplications(data.applications || []);
    } catch (error) {
      console.error("Fetch applicants error:", error);

      const message =
        error.message || "Unable to load applicants.";

      setApplicationsError(message);
      toast.error(message);
    } finally {
      setApplicationsLoading(false);
    }
  };

  /* =========================================================
     UPDATE APPLICATION STATUS
  ========================================================= */

  const updateApplicationStatus = async (
    applicationId,
    status,
  ) => {
    try {
      setUpdatingApplicationId(applicationId);

      setApplicationsError("");

      const response = await fetch(
        `${API_URL}/api/applications/${applicationId}/status`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            status,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update application.",
        );
      }

      setApplications((previous) =>
        previous.map((application) =>
          application._id === applicationId
            ? {
                ...application,
                status,
              }
            : application,
        ),
      );

      window.dispatchEvent(
        new Event("workmate-badges-refresh"),
      );

      toast.success(
        status === "accepted"
          ? "Application accepted successfully."
          : "Application rejected successfully.",
      );
    } catch (error) {
      console.error(
        "Update application status error:",
        error,
      );

      const message =
        error.message || "Unable to update application.";

      setApplicationsError(message);
      toast.error(message);
    } finally {
      setUpdatingApplicationId("");
    }
  };

  /* =========================================================
     CLOSE / REOPEN JOB
  ========================================================= */

  const updateJobStatus = async (job, newStatus) => {
    try {
      setUpdatingJobId(job._id);
      setError("");

      const response = await fetch(
        `${API_URL}/api/jobs/${job._id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            title: job.title,
            skill: job.skill,
            location: job.location,
            salary: job.salary,
            jobType: job.jobType,
            description: job.description || "",
            status: newStatus,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update job status.",
        );
      }

      setJobs((previous) =>
        previous.map((currentJob) =>
          currentJob._id === job._id
            ? {
                ...currentJob,
                status: newStatus,
              }
            : currentJob,
        ),
      );

      window.dispatchEvent(
        new Event("workmate-badges-refresh"),
      );

      toast.success(
        newStatus === "closed"
          ? "Job closed successfully."
          : "Job reopened successfully.",
      );
    } catch (error) {
      console.error("Update job status error:", error);

      const message =
        error.message || "Unable to update job status.";

      setError(message);
      toast.error(message);
    } finally {
      setUpdatingJobId("");
    }
  };

  /* =========================================================
     OPEN EDIT JOB
  ========================================================= */

  const openEditJob = (job) => {
    setEditingJob(job);
    setEditError("");

    setEditForm({
      title: job.title || "",
      skill: job.skill || "",
      location: job.location || "",
      salary: job.salary || "",
      jobType: job.jobType || "",
      description: job.description || "",
    });
  };

  /* =========================================================
     EDIT INPUT
  ========================================================= */

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =========================================================
     SAVE EDITED JOB
  ========================================================= */

  const saveEditedJob = async (event) => {
    event.preventDefault();

    if (!editingJob) {
      return;
    }

    try {
      setSavingEdit(true);
      setEditError("");

      const response = await fetch(
        `${API_URL}/api/jobs/${editingJob._id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            title: editForm.title.trim(),

            skill: editForm.skill.trim(),

            location: editForm.location.trim(),

            salary: Number(editForm.salary),

            jobType: editForm.jobType,

            description: editForm.description.trim(),

            status: editingJob.status || "open",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update job.",
        );
      }

      setJobs((previous) =>
        previous.map((job) =>
          job._id === editingJob._id
            ? data.job
            : job,
        ),
      );

      setEditingJob(null);

      window.dispatchEvent(
        new Event("workmate-badges-refresh"),
      );

      toast.success("Job updated successfully.");
    } catch (error) {
      console.error("Edit job error:", error);

      const message =
        error.message || "Unable to update job.";

      setEditError(message);
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  };

  /* =========================================================
     DELETE JOB
  ========================================================= */

  const deleteJob = async (job) => {
    const confirmed = window.confirm(
      `Delete "${job.title}" permanently?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingJobId(job._id);
      setError("");

      const response = await fetch(
        `${API_URL}/api/jobs/${job._id}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete job.",
        );
      }

      setJobs((previous) =>
        previous.filter(
          (currentJob) => currentJob._id !== job._id,
        ),
      );

      if (selectedJob?._id === job._id) {
        setSelectedJob(null);
      }

      window.dispatchEvent(
        new Event("workmate-badges-refresh"),
      );

      toast.success("Job deleted successfully.");
    } catch (error) {
      console.error("Delete job error:", error);

      const message =
        error.message || "Unable to delete job.";

      setError(message);
      toast.error(message);
    } finally {
      setDeletingJobId("");
    }
  };

  /* =========================================================
     CLOSE APPLICANTS
  ========================================================= */

  const closeApplicants = () => {
    setSelectedJob(null);
    setApplications([]);
    setApplicationsError("");
    setUpdatingApplicationId("");
  };

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section className="my-jobs" id="my-jobs">
      <div className="my-jobs-heading">
        <span>YOUR JOB POSTS</span>

        <h2>Manage your jobs and applicants.</h2>

        <p>
          Edit your job posts, manage applications, and
          control whether a job is open or closed.
        </p>
      </div>

      {loading ? (
        <div className="my-jobs-empty">
          <h3>Loading your jobs...</h3>
        </div>
      ) : error ? (
        <div className="my-jobs-empty">
          <h3>Unable to load jobs</h3>

          <p>{error}</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="my-jobs-empty">
          <div className="my-jobs-empty-icon">
            💼
          </div>

          <h3>No jobs posted yet</h3>

          <p>Your posted jobs will appear here.</p>
        </div>
      ) : (
        <div className="my-jobs-list">
          {jobs.map((job) => {
            const jobStatus =
              job.status || "open";

            const isJobUpdating =
              updatingJobId === job._id;

            const isDeleting =
              deletingJobId === job._id;

            return (
              <article
                className="my-job-card"
                key={job._id}
              >
                <div className="my-job-card-top">
                  <ProfileAvatar
                    person={job.employer}
                    fallback="💼"
                    className="my-job-icon"
                    alt={
                      job.employer?.name ||
                      "Employer"
                    }
                  />

                  <div>
                    <span
                      className={`my-job-status my-job-status-${jobStatus}`}
                    >
                      {jobStatus}
                    </span>

                    <h3>{job.title}</h3>

                    <p>{job.skill}</p>
                  </div>
                </div>

                <div className="my-job-info">
                  <div>
                    <span>📍 Location</span>

                    <strong>
                      {job.location}
                    </strong>
                  </div>

                  <div>
                    <span>🕒 Job Type</span>

                    <strong>
                      {job.jobType}
                    </strong>
                  </div>

                  <div>
                    <span>💰 Salary</span>

                    <strong>
                      ₹
                      {Number(
                        job.salary || 0,
                      ).toLocaleString(
                        "en-IN",
                      )}
                    </strong>
                  </div>
                </div>

                {job.description && (
                  <div className="my-job-description">
                    <span>
                      JOB DESCRIPTION
                    </span>

                    <p>
                      {job.description}
                    </p>
                  </div>
                )}

                <div className="my-job-date">
                  Posted{" "}
                  {new Date(
                    job.createdAt,
                  ).toLocaleString(
                    "en-IN",
                  )}
                </div>

                <div className="job-manage-actions">
                  <button
                    type="button"
                    className="edit-job-btn"
                    disabled={
                      isDeleting ||
                      isJobUpdating
                    }
                    onClick={() =>
                      openEditJob(job)
                    }
                  >
                    ✏️ Edit Job
                  </button>

                  <button
                    type="button"
                    className="delete-job-btn"
                    disabled={
                      isDeleting ||
                      isJobUpdating
                    }
                    onClick={() =>
                      deleteJob(job)
                    }
                  >
                    {isDeleting
                      ? "Deleting..."
                      : "🗑 Delete Job"}
                  </button>
                </div>

                <button
                  className={
                    jobStatus === "closed"
                      ? "reopen-job-btn"
                      : "close-job-btn"
                  }
                  type="button"
                  disabled={
                    isJobUpdating ||
                    isDeleting
                  }
                  onClick={() =>
                    updateJobStatus(
                      job,
                      jobStatus === "closed"
                        ? "open"
                        : "closed",
                    )
                  }
                >
                  {isJobUpdating
                    ? "Updating..."
                    : jobStatus === "closed"
                      ? "↻ Reopen Job"
                      : "✕ Close Job"}
                </button>

                <button
                  className="view-applicants-btn"
                  type="button"
                  disabled={isDeleting}
                  onClick={() =>
                    handleViewApplicants(job)
                  }
                >
                  View Applicants →
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* =====================================================
          EDIT JOB MODAL
      ===================================================== */}

      {editingJob && (
        <div
          className="edit-job-overlay"
          onClick={() => {
            if (!savingEdit) {
              setEditingJob(null);
            }
          }}
        >
          <div
            className="edit-job-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="edit-job-close"
              type="button"
              disabled={savingEdit}
              onClick={() =>
                setEditingJob(null)
              }
            >
              ×
            </button>

            <span className="edit-job-label">
              EDIT JOB
            </span>

            <h2>
              Update job details.
            </h2>

            <p>
              Change the information workers see when
              browsing this opportunity.
            </p>

            <form
              className="edit-job-form"
              onSubmit={saveEditedJob}
            >
              <label>
                Job Title
                <input
                  type="text"
                  name="title"
                  value={editForm.title}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label>
                Required Skill
                <select
                  name="skill"
                  value={editForm.skill}
                  onChange={handleEditChange}
                  required
                >
                  <option value="">
                    Select skill
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
              </label>

              <label>
                Location
                <input
                  type="text"
                  name="location"
                  value={editForm.location}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label>
                Monthly Salary (₹)
                <input
                  type="number"
                  name="salary"
                  min="0"
                  value={editForm.salary}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label>
                Job Type
                <select
                  name="jobType"
                  value={editForm.jobType}
                  onChange={handleEditChange}
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
              </label>

              <label className="edit-job-full">
                Job Description

                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows="5"
                />
              </label>

              {editError && (
                <div className="edit-job-error">
                  {editError}
                </div>
              )}

              <button
                className="save-job-edit-btn"
                type="submit"
                disabled={savingEdit}
              >
                {savingEdit
                  ? "Saving Changes..."
                  : "✓ Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          APPLICANTS MODAL
      ===================================================== */}

      {selectedJob && (
        <div
          className="applicants-overlay"
          onClick={closeApplicants}
        >
          <div
            className="applicants-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="applicants-close"
              type="button"
              onClick={closeApplicants}
            >
              ×
            </button>

            <span className="applicants-label">
              JOB APPLICANTS
            </span>

            <h2>
              {selectedJob.title}
            </h2>

            <p className="applicants-intro">
              Workers who applied for this job.
            </p>

            {applicationsLoading ? (
              <div className="applicants-empty">
                <h3>
                  Loading applicants...
                </h3>
              </div>
            ) : applicationsError ? (
              <div className="applicants-empty">
                <h3>
                  Unable to load applicants
                </h3>

                <p>
                  {applicationsError}
                </p>
              </div>
            ) : applications.length === 0 ? (
              <div className="applicants-empty">
                <div className="applicants-empty-icon">
                  👥
                </div>

                <h3>
                  No applicants yet
                </h3>

                <p>
                  Worker applications will appear here.
                </p>
              </div>
            ) : (
              <div className="applicants-list">
                {applications.map(
                  (application) => {
                    const profile =
                      application.workerProfile;

                    const status =
                      application.status ||
                      "pending";

                    const isUpdating =
                      updatingApplicationId ===
                      application._id;

                    return (
                      <article
                        className="applicant-card"
                        key={
                          application._id
                        }
                      >
                        <div className="applicant-top">
                          <ProfileAvatar
                            person={
                              profile ||
                              application.worker
                            }
                            fallback={
                              profile?.emoji ||
                              "👨‍🍳"
                            }
                            className="applicant-avatar"
                            alt={
                              profile?.name ||
                              application.worker
                                ?.name ||
                              "Worker"
                            }
                          />

                          <div className="applicant-main-info">
                            <span
                              className={`applicant-status applicant-status-${status}`}
                            >
                              {status}
                            </span>

                            <h3>
                              {profile?.name ||
                                application.worker
                                  ?.name ||
                                "Worker"}
                            </h3>

                            <p>
                              {profile?.role ||
                                "Worker"}
                            </p>
                          </div>
                        </div>

                        <div className="applicant-info">
                          <div>
                            <span>
                              📍 Location
                            </span>

                            <strong>
                              {profile?.location ||
                                "Not specified"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              💼 Experience
                            </span>

                            <strong>
                              {profile?.experience ||
                                "Not specified"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              📞 Phone
                            </span>

                            <strong>
                              {profile?.phone ||
                                "Not available"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              ✉️ Email
                            </span>

                            <strong>
                              {application.worker
                                ?.email ||
                                "Not available"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              🕒 Availability
                            </span>

                            <strong>
                              {profile?.availability ||
                                "Not specified"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              💰 Expected Salary
                            </span>

                            <strong>
                              ₹
                              {Number(
                                profile?.salary ||
                                  0,
                              ).toLocaleString(
                                "en-IN",
                              )}
                            </strong>
                          </div>
                        </div>

                        {Array.isArray(
                          profile?.skills,
                        ) &&
                          profile.skills.length >
                            0 && (
                            <div className="applicant-skills">
                              {profile.skills.map(
                                (skill) => (
                                  <span
                                    key={
                                      skill
                                    }
                                  >
                                    {skill}
                                  </span>
                                ),
                              )}
                            </div>
                          )}

                        <div className="applicant-date">
                          Applied{" "}
                          {new Date(
                            application.createdAt,
                          ).toLocaleString(
                            "en-IN",
                          )}
                        </div>

                        {status === "pending" ? (
                          <div className="applicant-actions">
                            <button
                              className="applicant-accept-btn"
                              type="button"
                              disabled={
                                isUpdating
                              }
                              onClick={() =>
                                updateApplicationStatus(
                                  application._id,
                                  "accepted",
                                )
                              }
                            >
                              {isUpdating
                                ? "Updating..."
                                : "✓ Accept"}
                            </button>

                            <button
                              className="applicant-reject-btn"
                              type="button"
                              disabled={
                                isUpdating
                              }
                              onClick={() =>
                                updateApplicationStatus(
                                  application._id,
                                  "rejected",
                                )
                              }
                            >
                              {isUpdating
                                ? "Updating..."
                                : "✕ Reject"}
                            </button>
                          </div>
                        ) : (
                          <div
                            className={`applicant-final-status applicant-final-${status}`}
                          >
                            {status ===
                            "accepted"
                              ? "✓ You accepted this applicant"
                              : "✕ You rejected this applicant"}
                          </div>
                        )}
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default MyJobs;