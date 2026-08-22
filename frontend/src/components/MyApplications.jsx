import {
  useEffect,
  useMemo,
  useState,
} from "react";

import ProfileAvatar from "./ProfileAvatar";

function MyApplications() {
  const token =
    localStorage.getItem(
      "workmateToken"
    );

  const [applications, setApplications] =
    useState([]);

  const [loading, setLoading] =
    useState(Boolean(token));

  const [error, setError] =
    useState(
      token
        ? ""
        : "Please login as a worker to view applications."
    );

  /* =========================================================
     FETCH APPLICATIONS
  ========================================================= */

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchApplications =
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await fetch(
              "http://localhost:5000/api/applications/my",
              {
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
                "Failed to load applications."
            );
          }

          setApplications(
            data.applications ||
              []
          );
        } catch (error) {
          console.error(
            "Fetch my applications error:",
            error
          );

          setError(
            error.message ||
              "Unable to load your applications."
          );
        } finally {
          setLoading(false);
        }
      };

    fetchApplications();
  }, [token]);

  /* =========================================================
     REMOVE INVALID / ORPHAN APPLICATIONS FROM UI
  ========================================================= */

  const validApplications =
    useMemo(
      () =>
        applications.filter(
          (application) =>
            Boolean(
              application?.job?._id
            )
        ),
      [applications]
    );

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section
      className="my-applications"
      id="my-applications"
    >
      <div className="my-applications-heading">
        <span>
          MY APPLICATIONS
        </span>

        <h2>
          Track your job applications.
        </h2>

        <p>
          See which jobs you applied for and
          whether the employer accepted or rejected
          your application.
        </p>
      </div>

      {loading ? (
        <div className="my-applications-empty">
          <h3>
            Loading applications...
          </h3>
        </div>
      ) : error ? (
        <div className="my-applications-empty">
          <h3>
            Unable to load applications
          </h3>

          <p>
            {error}
          </p>
        </div>
      ) : validApplications.length ===
        0 ? (
        <div className="my-applications-empty">
          <div className="my-applications-empty-icon">
            📄
          </div>

          <h3>
            No applications yet
          </h3>

          <p>
            Jobs you apply for will appear here.
          </p>
        </div>
      ) : (
        <div className="my-applications-list">
          {validApplications.map(
            (application) => {
              const job =
                application.job;

              const employer =
                job?.employer;

              const status =
                application.status ||
                "pending";

              let statusMessage =
                "⏳ Waiting for employer response";

              if (
                status ===
                "accepted"
              ) {
                statusMessage =
                  "✓ Employer accepted your application";
              }

              if (
                status ===
                "rejected"
              ) {
                statusMessage =
                  "✕ Employer rejected your application";
              }

              return (
                <article
                  className="my-application-card"
                  key={
                    application._id
                  }
                >
                  {/* =================================================
                      EMPLOYER + JOB
                  ================================================= */}

                  <div className="my-application-top">
                    <ProfileAvatar
                      person={
                        employer
                      }
                      fallback="🏢"
                      className="my-application-icon"
                      alt={
                        employer?.name ||
                        "Employer"
                      }
                    />

                    <div className="my-application-main">
                      <span
                        className={`my-application-status my-application-status-${status}`}
                      >
                        {status}
                      </span>

                      <h3>
                        {job.title}
                      </h3>

                      <p>
                        {job.skill ||
                          "Not specified"}
                      </p>

                      {employer?.name && (
                        <div className="my-application-employer">
                          <span>
                            Posted by
                          </span>

                          <strong>
                            {
                              employer.name
                            }
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* =================================================
                      JOB INFO
                  ================================================= */}

                  <div className="my-application-info">
                    <div>
                      <span>
                        📍 Location
                      </span>

                      <strong>
                        {job.location ||
                          "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        🕒 Job Type
                      </span>

                      <strong>
                        {job.jobType ||
                          "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        💰 Salary
                      </span>

                      <strong>
                        ₹
                        {Number(
                          job.salary ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>
                  </div>

                  {/* =================================================
                      DATE
                  ================================================= */}

                  <div className="my-application-date">
                    Applied{" "}
                    {new Date(
                      application.createdAt
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </div>

                  {/* =================================================
                      STATUS RESULT
                  ================================================= */}

                  <div
                    className={`my-application-result my-application-result-${status}`}
                  >
                    {statusMessage}
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

export default MyApplications;