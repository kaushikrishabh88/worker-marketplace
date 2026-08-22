import {
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

  const token =
    localStorage.getItem(
      "workmateToken"
    );

  /* =========================================================
     DASHBOARD DATA
  ========================================================= */

  useEffect(() => {
    const loadDashboard = async () => {
      if (!token || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        /* =====================================================
           WORKER DASHBOARD
        ===================================================== */

        if (user.role === "worker") {
          const [
            applicationsResponse,
            requestsResponse,
            workersResponse,
          ] = await Promise.all([
            fetch(
              "http://localhost:5000/api/applications/my",
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            ),

            fetch(
              "http://localhost:5000/api/contact-requests/my",
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            ),

            fetch(
              "http://localhost:5000/api/workers"
            ),
          ]);

          const applicationsData =
            await applicationsResponse.json();

          const requestsData =
            await requestsResponse.json();

          const workersData =
            await workersResponse.json();

          if (
            applicationsResponse.ok
          ) {
            setApplications(
              applicationsData.applications ||
                []
            );
          }

          if (requestsResponse.ok) {
            setReceivedRequests(
              requestsData.requests ||
                []
            );
          }

          /* ===================================================
             FIND LOGGED-IN WORKER PROFILE
          =================================================== */

          if (workersResponse.ok) {
            const workers =
              workersData.workers || [];

            const currentUserId =
              String(
                user.id ||
                  user._id ||
                  ""
              );

            const profile =
              workers.find(
                (worker) => {
                  const workerUserId =
                    typeof worker.user ===
                    "object"
                      ? String(
                          worker.user?._id ||
                            worker.user?.id ||
                            ""
                        )
                      : String(
                          worker.user ||
                            ""
                        );

                  return (
                    workerUserId ===
                    currentUserId
                  );
                }
              );

            setWorkerProfile(
              profile || null
            );
          }
        }

        /* =====================================================
           EMPLOYER DASHBOARD
        ===================================================== */

        if (
          user.role === "employer"
        ) {
          const [
            jobsResponse,
            requestsResponse,
          ] = await Promise.all([
            fetch(
              "http://localhost:5000/api/jobs/my",
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            ),

            fetch(
              "http://localhost:5000/api/contact-requests/sent",
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            ),
          ]);

          const jobsData =
            await jobsResponse.json();

          const requestsData =
            await requestsResponse.json();

          if (jobsResponse.ok) {
            setJobs(
              jobsData.jobs || []
            );
          }

          if (
            requestsResponse.ok
          ) {
            setSentRequests(
              requestsData.requests ||
                []
            );
          }
        }
      } catch (error) {
        console.error(
          "Dashboard summary error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [token, user]);

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
              "accepted"
          ).length,

        pendingApplications:
          applications.filter(
            (application) =>
              application.status ===
              "pending"
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
              job.status === "open"
          ).length,

        sentRequests:
          sentRequests.length,

        acceptedWorkers:
          sentRequests.filter(
            (request) =>
              request.status ===
              "accepted"
          ).length,
      };
    }, [
      jobs,
      sentRequests,
    ]);

  /* =========================================================
     OPEN MY PROFILE
  ========================================================= */

  const openMyProfile = () => {
    if (!workerProfile?._id) {
      return;
    }

    navigate(
      `/workers/${workerProfile._id}`
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
    >
      <div className="dashboard-summary-heading">
        <span>
          YOUR DASHBOARD
        </span>

        <h2>
          Welcome back, {user.name}.
        </h2>

        <p>
          Here is a quick overview of your
          WorkMate activity.
        </p>
      </div>

      {loading ? (
        <div className="dashboard-loading">
          Loading dashboard...
        </div>
      ) : user.role ===
        "worker" ? (
        <div className="dashboard-stat-grid">
          {/* ===============================================
              MY PROFILE
          =============================================== */}

          {workerProfile && (
            <button
              className="dashboard-stat-card dashboard-profile-card"
              type="button"
              onClick={openMyProfile}
            >
              <div className="dashboard-stat-icon">
                👤
              </div>

              <span>
                MY PROFILE
              </span>

              <strong>
                →
              </strong>

              <p>
                View and manage your worker
                profile.
              </p>
            </button>
          )}

          {/* ===============================================
              APPLICATIONS
          =============================================== */}

          <div className="dashboard-stat-card">
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
              Jobs you have applied for.
            </p>
          </div>

          {/* ===============================================
              ACCEPTED
          =============================================== */}

          <div className="dashboard-stat-card">
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
              Applications accepted by
              employers.
            </p>
          </div>

          {/* ===============================================
              PENDING
          =============================================== */}

          <div className="dashboard-stat-card">
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
              Applications waiting for
              response.
            </p>
          </div>

          {/* ===============================================
              REQUESTS
          =============================================== */}

          <div className="dashboard-stat-card">
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
              Businesses that contacted you.
            </p>
          </div>
        </div>
      ) : (
        <div className="dashboard-stat-grid">
          {/* ===============================================
              MY JOBS
          =============================================== */}

          <div className="dashboard-stat-card">
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
          </div>

          {/* ===============================================
              OPEN JOBS
          =============================================== */}

          <div className="dashboard-stat-card">
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
              Jobs currently accepting
              workers.
            </p>
          </div>

          {/* ===============================================
              SENT REQUESTS
          =============================================== */}

          <div className="dashboard-stat-card">
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
              Workers you have contacted.
            </p>
          </div>

          {/* ===============================================
              ACCEPTED WORKERS
          =============================================== */}

          <div className="dashboard-stat-card">
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
              Workers who accepted your
              request.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export default DashboardSummary;