import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

function DashboardSummary({ user }) {
  const navigate = useNavigate();

  const [applications, setApplications] =
    useState([]);

  const [
    receivedRequests,
    setReceivedRequests,
  ] = useState([]);

  const [
    sentRequests,
    setSentRequests,
  ] = useState([]);

  const [jobs, setJobs] =
    useState([]);

  const [
    workerProfile,
    setWorkerProfile,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const token =
    localStorage.getItem(
      "workmateToken",
    );

  /* =========================================================
     FETCH HELPER
  ========================================================= */

  const fetchJson =
    useCallback(
      async (
        url,
        options = {},
      ) => {
        const response =
          await fetch(
            url,
            options,
          );

        let data = {};

        try {
          data =
            await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load dashboard data.",
          );
        }

        return data;
      },
      [],
    );

  /* =========================================================
     LOAD WORKER DASHBOARD
  ========================================================= */

  const loadWorkerDashboard =
    useCallback(
      async () => {
        const authHeaders = {
          Authorization:
            `Bearer ${token}`,
        };

        const [
          applicationsData,
          requestsData,
          workersData,
        ] = await Promise.all([
          fetchJson(
            "http://localhost:5000/api/applications/my",
            {
              headers:
                authHeaders,
            },
          ),

          fetchJson(
            "http://localhost:5000/api/contact-requests/my",
            {
              headers:
                authHeaders,
            },
          ),

          /*
           * Temporary architecture:
           * Production hardening mein
           * isko /api/workers/me se
           * replace karenge.
           */
          fetchJson(
            "http://localhost:5000/api/workers",
          ),
        ]);

        setApplications(
          applicationsData.applications ||
            [],
        );

        setReceivedRequests(
          requestsData.requests ||
            [],
        );

        const workers =
          workersData.workers ||
          [];

        const currentUserId =
          String(
            user?.id ||
              user?._id ||
              "",
          );

        const profile =
          workers.find(
            (worker) => {
              const workerUserId =
                typeof worker.user ===
                "object"
                  ? String(
                      worker.user
                        ?._id ||
                        worker.user
                          ?.id ||
                        "",
                    )
                  : String(
                      worker.user ||
                        "",
                    );

              return (
                workerUserId ===
                currentUserId
              );
            },
          );

        setWorkerProfile(
          profile || null,
        );
      },
      [
        fetchJson,
        token,
        user,
      ],
    );

  /* =========================================================
     LOAD EMPLOYER DASHBOARD
  ========================================================= */

  const loadEmployerDashboard =
    useCallback(
      async () => {
        const authHeaders = {
          Authorization:
            `Bearer ${token}`,
        };

        const [
          jobsData,
          requestsData,
        ] = await Promise.all([
          fetchJson(
            "http://localhost:5000/api/jobs/my",
            {
              headers:
                authHeaders,
            },
          ),

          fetchJson(
            "http://localhost:5000/api/contact-requests/sent",
            {
              headers:
                authHeaders,
            },
          ),
        ]);

        setJobs(
          jobsData.jobs || [],
        );

        setSentRequests(
          requestsData.requests ||
            [],
        );
      },
      [
        fetchJson,
        token,
      ],
    );

  /* =========================================================
     DASHBOARD DATA
  ========================================================= */

  const loadDashboard =
    useCallback(
      async () => {
        if (!token || !user) {
          setLoading(false);

          return;
        }

        try {
          setLoading(true);
          setError("");

          if (
            user.role === "worker"
          ) {
            await loadWorkerDashboard();
          } else if (
            user.role ===
            "employer"
          ) {
            await loadEmployerDashboard();
          }
        } catch (error) {
          console.error(
            "Dashboard summary error:",
            error,
          );

          setError(
            error.message ||
              "We couldn't load your dashboard right now.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        loadEmployerDashboard,
        loadWorkerDashboard,
        token,
        user,
      ],
    );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* =========================================================
     WORKER STATS
  ========================================================= */

  const workerStats =
    useMemo(() => {
      return {
        totalApplications:
          applications.length,

        acceptedApplications:
          applications.filter(
            (application) =>
              application.status ===
              "accepted",
          ).length,

        pendingApplications:
          applications.filter(
            (application) =>
              application.status ===
              "pending",
          ).length,

        employerRequests:
          receivedRequests.length,
      };
    }, [
      applications,
      receivedRequests,
    ]);

  /* =========================================================
     EMPLOYER STATS
  ========================================================= */

  const employerStats =
    useMemo(() => {
      return {
        totalJobs:
          jobs.length,

        openJobs:
          jobs.filter(
            (job) =>
              job.status ===
              "open",
          ).length,

        sentRequests:
          sentRequests.length,

        acceptedWorkers:
          sentRequests.filter(
            (request) =>
              request.status ===
              "accepted",
          ).length,
      };
    }, [
      jobs,
      sentRequests,
    ]);

  /* =========================================================
     SECTION NAVIGATION
  ========================================================= */

  const scrollToSection = (
    sectionId,
  ) => {
    const section =
      document.getElementById(
        sectionId,
      );

    if (!section) {
      return;
    }

    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  /* =========================================================
     WORKER PROFILE
  ========================================================= */

  const handleWorkerProfile =
    () => {
      if (workerProfile?._id) {
        navigate(
          `/workers/${workerProfile._id}`,
        );

        return;
      }

      /*
       * Worker hasn't created profile yet.
       */
      scrollToSection(
        "register-worker",
      );
    };

  /* =========================================================
     EMPLOYER PROFILE
  ========================================================= */

  const handleEmployerProfile =
    () => {
      scrollToSection(
        "employer-profile",
      );
    };

  if (!user) {
    return null;
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section
      className="dashboard-summary"
      id="dashboard-summary"
      aria-labelledby="dashboard-heading"
    >
      {/* =====================================================
          HEADING
      ===================================================== */}

      <div className="dashboard-summary-heading">
        <span>
          YOUR DASHBOARD
        </span>

        <h2 id="dashboard-heading">
          Welcome back,{" "}
          {user.name}.
        </h2>

        <p>
          Here is a quick overview
          of your WorkMate activity.
        </p>
      </div>

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (
        <div
          className="dashboard-loading"
          role="status"
          aria-live="polite"
        >
          <div>
            <strong>
              Loading your dashboard
            </strong>

            <p>
              Fetching your latest
              WorkMate activity...
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          ERROR
      ===================================================== */}

      {!loading && error && (
        <div
          className="dashboard-error"
          role="alert"
        >
          <div className="dashboard-error-icon">
            !
          </div>

          <div className="dashboard-error-content">
            <strong>
              Dashboard couldn't load
            </strong>

            <p>
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={
              loadDashboard
            }
          >
            Try Again
          </button>
        </div>
      )}

      {/* =====================================================
          WORKER DASHBOARD
      ===================================================== */}

      {!loading &&
        !error &&
        user.role === "worker" && (
          <div className="dashboard-stat-grid">
            {/* ===============================================
                PROFILE
            =============================================== */}

            <button
              type="button"
              className="dashboard-stat-card dashboard-profile-card dashboard-clickable-card"
              onClick={
                handleWorkerProfile
              }
              aria-label={
                workerProfile
                  ? "Open my worker profile"
                  : "Create my worker profile"
              }
            >
              <div className="dashboard-stat-icon">
                👤
              </div>

              <span>
                {workerProfile
                  ? "MY PROFILE"
                  : "CREATE PROFILE"}
              </span>

              <strong>
                →
              </strong>

              <p>
                {workerProfile
                  ? "View and manage your worker profile."
                  : "Complete your worker profile to get discovered by employers."}
              </p>
            </button>

            {/* ===============================================
                APPLICATIONS
            =============================================== */}

            <button
              type="button"
              className="dashboard-stat-card dashboard-clickable-card"
              onClick={() =>
                scrollToSection(
                  "my-applications",
                )
              }
              aria-label={`View ${workerStats.totalApplications} job applications`}
            >
              <div className="dashboard-stat-icon">
                📄
              </div>

              <span>
                MY APPLICATIONS
              </span>

              <strong>
                {
                  workerStats.totalApplications
                }
              </strong>

              <p>
                Jobs you have applied
                for.
              </p>
            </button>

            {/* ===============================================
                ACCEPTED
            =============================================== */}

            <button
              type="button"
              className="dashboard-stat-card dashboard-clickable-card"
              onClick={() =>
                scrollToSection(
                  "my-applications",
                )
              }
              aria-label={`View ${workerStats.acceptedApplications} accepted applications`}
            >
              <div className="dashboard-stat-icon">
                ✅
              </div>

              <span>
                ACCEPTED
              </span>

              <strong>
                {
                  workerStats.acceptedApplications
                }
              </strong>

              <p>
                Applications accepted
                by employers.
              </p>
            </button>

            {/* ===============================================
                PENDING
            =============================================== */}

            <button
              type="button"
              className="dashboard-stat-card dashboard-clickable-card"
              onClick={() =>
                scrollToSection(
                  "my-applications",
                )
              }
              aria-label={`View ${workerStats.pendingApplications} pending applications`}
            >
              <div className="dashboard-stat-icon">
                ⏳
              </div>

              <span>
                PENDING
              </span>

              <strong>
                {
                  workerStats.pendingApplications
                }
              </strong>

              <p>
                Applications waiting
                for an employer
                response.
              </p>
            </button>

            {/* ===============================================
                EMPLOYER REQUESTS
            =============================================== */}

            <button
              type="button"
              className="dashboard-stat-card dashboard-clickable-card"
              onClick={() =>
                scrollToSection(
                  "received-requests",
                )
              }
              aria-label={`View ${workerStats.employerRequests} employer requests`}
            >
              <div className="dashboard-stat-icon">
                📩
              </div>

              <span>
                EMPLOYER REQUESTS
              </span>

              <strong>
                {
                  workerStats.employerRequests
                }
              </strong>

              <p>
                Businesses that have
                contacted you.
              </p>
            </button>
          </div>
        )}

      {/* =====================================================
          EMPLOYER DASHBOARD
      ===================================================== */}

      {!loading &&
        !error &&
        user.role ===
          "employer" && (
          <div className="dashboard-stat-grid">
            {/* ===============================================
                EMPLOYER PROFILE
            =============================================== */}

            <button
              type="button"
              className="dashboard-stat-card dashboard-profile-card dashboard-clickable-card"
              onClick={
                handleEmployerProfile
              }
              aria-label="Open employer profile"
            >
              <div className="dashboard-stat-icon">
                🏢
              </div>

              <span>
                MY PROFILE
              </span>

              <strong>
                →
              </strong>

              <p>
                View and manage your
                employer profile.
              </p>
            </button>

            {/* ===============================================
                MY JOBS
            =============================================== */}

            <button
              type="button"
              className="dashboard-stat-card dashboard-clickable-card"
              onClick={() =>
                scrollToSection(
                  "my-jobs",
                )
              }
              aria-label={`View ${employerStats.totalJobs} job posts`}
            >
              <div className="dashboard-stat-icon">
                💼
              </div>

              <span>
                MY JOBS
              </span>

              <strong>
                {
                  employerStats.totalJobs
                }
              </strong>

              <p>
                Jobs you have posted.
              </p>
            </button>

            {/* ===============================================
                OPEN JOBS
            =============================================== */}

            <button
              type="button"
              className="dashboard-stat-card dashboard-clickable-card"
              onClick={() =>
                scrollToSection(
                  "my-jobs",
                )
              }
              aria-label={`View ${employerStats.openJobs} open jobs`}
            >
              <div className="dashboard-stat-icon">
                🟢
              </div>

              <span>
                OPEN JOBS
              </span>

              <strong>
                {
                  employerStats.openJobs
                }
              </strong>

              <p>
                Jobs currently
                accepting workers.
              </p>
            </button>

            {/* ===============================================
                SENT REQUESTS
            =============================================== */}

            <button
              type="button"
              className="dashboard-stat-card dashboard-clickable-card"
              onClick={() =>
                scrollToSection(
                  "sent-requests",
                )
              }
              aria-label={`View ${employerStats.sentRequests} sent requests`}
            >
              <div className="dashboard-stat-icon">
                📤
              </div>

              <span>
                SENT REQUESTS
              </span>

              <strong>
                {
                  employerStats.sentRequests
                }
              </strong>

              <p>
                Workers you have
                contacted.
              </p>
            </button>

            {/* ===============================================
                ACCEPTED WORKERS
            =============================================== */}

            <button
              type="button"
              className="dashboard-stat-card dashboard-clickable-card"
              onClick={() =>
                scrollToSection(
                  "sent-requests",
                )
              }
              aria-label={`View ${employerStats.acceptedWorkers} accepted workers`}
            >
              <div className="dashboard-stat-icon">
                🤝
              </div>

              <span>
                ACCEPTED WORKERS
              </span>

              <strong>
                {
                  employerStats.acceptedWorkers
                }
              </strong>

              <p>
                Workers who accepted
                your request.
              </p>
            </button>
          </div>
        )}
    </section>
  );
}

export default DashboardSummary;