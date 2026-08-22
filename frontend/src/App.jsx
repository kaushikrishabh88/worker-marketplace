import "./App.css";

import ToastProvider from "./components/ToastProvider";

import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";

import FindWorker from "./components/FindWorker";
import WorkerRegistration from "./components/WorkerRegistration";
import WorkerProfile from "./components/WorkerProfile";
import JobPosting from "./components/JobPosting";
import Auth from "./components/Auth";
import FindJobs from "./components/FindJobs";
import SentRequests from "./components/SentRequests";
import ReceivedRequests from "./components/ReceivedRequests";
import MyJobs from "./components/MyJobs";
import MyApplications from "./components/MyApplications";
import DashboardSummary from "./components/DashboardSummary";
import NavBadges from "./components/NavBadges";
import ProfileAvatar from "./components/ProfileAvatar";
import EmployerProfile from "./components/EmployerProfile";
import ContactUs from "./components/ContactUs";
import { useLanguage } from "./i18n/useLanguage";

function HomePage() {
  const navigate = useNavigate();

  const {
    language,
    changeLanguage,
    t,
  } = useLanguage();

  /* =========================================================
     LOGGED IN USER
  ========================================================= */

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
      "Failed to read logged-in user:",
      error
    );

    localStorage.removeItem(
      "workmateUser"
    );

    localStorage.removeItem(
      "workmateToken"
    );
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  const goToAuth = () => {
    navigate("/auth");
  };

  const handleLogout = () => {
    localStorage.removeItem(
      "workmateToken"
    );

    localStorage.removeItem(
      "workmateUser"
    );

    navigate("/");

    window.location.reload();
  };

  const scrollToWorkers = () => {
    document
      .getElementById(
        "find-workers"
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const scrollToJobs = () => {
    const targetId =
      user?.role === "employer"
        ? "post-job"
        : "find-jobs";

    document
      .getElementById(
        targetId
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const scrollToReceivedRequests =
    () => {
      document
        .getElementById(
          "received-requests"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    };

  /* =========================================================
     POPULAR SKILL NAVIGATION
  ========================================================= */

  const openWorkersBySkill = (
    skill
  ) => {
    /*
      Worker account par FindWorker component
      render nahi hota. Isliye worker ko
      misleading click action nahi denge.
    */

    if (
      user?.role === "worker"
    ) {
      return;
    }

    /*
      FindWorker ko selected skill bhejo.
    */

    window.dispatchEvent(
      new CustomEvent(
        "workmate:filter-workers",
        {
          detail: {
            skill,
          },
        }
      )
    );

    /*
      Filter update hone ke baad Find Workers
      section par smooth scroll.
    */

    window.setTimeout(
      () => {
        document
          .getElementById(
            "find-workers"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",
            block: "start",
          });
      },
      50
    );
  };

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="app">
      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="navbar">
        <div
          className="logo"
          onClick={() =>
            navigate("/")
          }
          style={{
            cursor: "pointer",
          }}
        >
          <span>Work</span>
          Mate
        </div>

        <div className="nav-links">
          {/* Guest */}

          {!user && (
            <>
              <a href="#find-workers">
                {t(
                  "findWorkers"
                )}
              </a>

              <a href="#find-jobs">
                {t("findJobs")}
              </a>
            </>
          )}

          {/* Employer */}

          {user?.role ===
            "employer" && (
            <>
              <a href="#find-workers">
                {t(
                  "findWorkers"
                )}
              </a>

              <a href="#sent-requests">
                {t(
                  "myRequests"
                )}

                <NavBadges
                  user={user}
                  type="requests"
                />
              </a>

              <a href="#my-jobs">
                {t("myJobs")}

                <NavBadges
                  user={user}
                  type="jobs"
                />
              </a>

              <a href="#employer-profile">
                {t(
                  "myProfile"
                )}
              </a>

              <a href="#post-job">
                {t("postJob")}
              </a>
            </>
          )}

          {/* Worker */}

          {user?.role ===
            "worker" && (
            <>
              <a href="#find-jobs">
                {t("findJobs")}
              </a>

              <a href="#my-applications">
                {t(
                  "myApplications"
                )}

                <NavBadges
                  user={user}
                  type="applications"
                />
              </a>

              <a href="#received-requests">
                {t(
                  "myRequests"
                )}

                <NavBadges
                  user={user}
                  type="requests"
                />
              </a>
            </>
          )}

          <a href="#how">
            {t("howItWorks")}
          </a>
          <a href="#contact-us">
  Contact Us
</a>
        </div>

        <div className="nav-actions">
          {/* ===============================================
              LANGUAGE SWITCHER
          =============================================== */}

          <div className="language-switcher">
            <button
              type="button"
              className={
                language === "en"
                  ? "language-btn active"
                  : "language-btn"
              }
              onClick={() =>
                changeLanguage(
                  "en"
                )
              }
            >
              English
            </button>

            <button
              type="button"
              className={
                language === "hi"
                  ? "language-btn active"
                  : "language-btn"
              }
              onClick={() =>
                changeLanguage(
                  "hi"
                )
              }
            >
              हिंदी
            </button>
          </div>

          {user ? (
            <>
              <div className="logged-user">
                <ProfileAvatar
                  person={user}
                  fallback={
                    user.role ===
                    "worker"
                      ? "👨‍🍳"
                      : "💼"
                  }
                  className="logged-user-icon"
                  alt={user.name}
                />

                <div className="logged-user-info">
                  <strong>
                    {user.name}
                  </strong>

                  <small>
                    {user.role ===
                    "worker"
                      ? t(
                          "worker"
                        )
                      : t(
                          "employer"
                        )}
                  </small>
                </div>
              </div>

              <button
                className="login-btn"
                type="button"
                onClick={
                  handleLogout
                }
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <>
              <button
                className="login-btn"
                type="button"
                onClick={
                  goToAuth
                }
              >
                {t("login")}
              </button>

              <button
                className="signup-btn"
                type="button"
                onClick={
                  goToAuth
                }
              >
                {t(
                  "getStarted"
                )}
              </button>
            </>
          )}
        </div>
      </nav>

      <main>
        {/* =====================================================
            HERO SECTION
        ===================================================== */}

        <section className="hero">
          <div className="hero-glow glow-one"></div>

          <div className="hero-glow glow-two"></div>

          <div className="hero-content">
            <div className="badge">
              <span className="pulse-dot"></span>

              {t(
                "heroBadge"
              )}
            </div>

            <h1>
              {t(
                "heroTitleStart"
              )}

              <span>
                {" "}
                {t(
                  "heroTitleHighlight"
                )}
              </span>

              <br />

              {t(
                "heroTitleEnd"
              )}
            </h1>

            <p>
              {t(
                "heroDescription"
              )}
            </p>

            <div className="hero-buttons">
              <button
                className="primary-btn"
                type="button"
                onClick={
                  user?.role ===
                  "worker"
                    ? scrollToJobs
                    : scrollToWorkers
                }
              >
                {user?.role ===
                "worker"
                  ? t(
                      "findAJob"
                    )
                  : t(
                      "findAWorker"
                    )}{" "}

                <span>→</span>
              </button>

              <button
                className="secondary-btn"
                type="button"
                onClick={
                  user?.role ===
                  "worker"
                    ? scrollToReceivedRequests
                    : scrollToJobs
                }
              >
                {user?.role ===
                "worker"
                  ? t(
                      "myRequests"
                    )
                  : user?.role ===
                      "employer"
                    ? t(
                        "postJob"
                      )
                    : t(
                        "findAJob"
                      )}{" "}

                <span>→</span>
              </button>
            </div>

            <div className="trust-row">
              <div className="avatars">
                <div>👨‍🍳</div>
                <div>👩‍🍳</div>
                <div>🧑‍🔧</div>
                <div>👨‍🍳</div>
              </div>

              <div>
                <strong>
                  {t(
                    "skilledPeople"
                  )}
                </strong>

                <small>
                  {t(
                    "builtForLocal"
                  )}
                </small>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="floating-card card-one">
              <div className="mini-icon">
                🍰
              </div>

              <div>
                <strong>
                  {t(
                    "expertBaker"
                  )}
                </strong>

                <small>
                  {t(
                    "threeYearsExperience"
                  )}
                </small>
              </div>

              <span className="verified">
                ✓
              </span>
            </div>

            <div className="worker-card">
              <div className="worker-image">
                👨‍🍳
              </div>

              <div className="worker-info">
                <div className="worker-top">
                  <div>
                    <h3>
                      {t(
                        "skilledWorker"
                      )}
                    </h3>

                    <p>
                      {t(
                        "bakeryFastFood"
                      )}
                    </p>
                  </div>

                  <span className="online-dot"></span>
                </div>

                <div className="skills">
                  <span>
                    🍕{" "}
                    {t(
                      "pizza"
                    )}
                  </span>

                  <span>
                    🍔{" "}
                    {t(
                      "burger"
                    )}
                  </span>

                  <span>
                    🍰{" "}
                    {t(
                      "bakery"
                    )}
                  </span>
                </div>

                <div className="worker-details">
                  <span>
                    📍{" "}
                    {t(
                      "nearby"
                    )}
                  </span>

                  <span>
                    ⭐{" "}
                    {t(
                      "verified"
                    )}
                  </span>

                  <span>
                    ✓{" "}
                    {t(
                      "available"
                    )}
                  </span>
                </div>

                <button
                  className="profile-btn"
                  type="button"
                  onClick={
                    user?.role ===
                    "worker"
                      ? scrollToJobs
                      : scrollToWorkers
                  }
                >
                  {user?.role ===
                  "worker"
                    ? t(
                        "viewJobs"
                      )
                    : t(
                        "viewWorkers"
                      )}{" "}
                  →
                </button>
              </div>
            </div>

            <div className="floating-card card-two">
              <span className="match-icon">
                ⚡
              </span>

              <div>
                <strong>
                  {t(
                    "smartMatch"
                  )}
                </strong>

                <small>
                  {t(
                    "findRightSkills"
                  )}
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            POPULAR SKILLS
        ===================================================== */}

        <section
          className="categories"
          id="how"
        >
          <div className="section-heading">
            <span>
              {t(
                "popularSkills"
              )}
            </span>

            <h2>
              {t(
                "skillsHeading"
              )}
            </h2>
          </div>

          <div className="category-grid">
            <button
              type="button"
              className="category-card category-card-button"
              onClick={() =>
                openWorkersBySkill(
                  "chef"
                )
              }
              disabled={
                user?.role ===
                "worker"
              }
            >
              <div>
                👨‍🍳
              </div>

              <h3>
                {t(
                  "chefCook"
                )}
              </h3>

              <p>
                {t(
                  "chefCookDescription"
                )}
              </p>
            </button>

            <button
              type="button"
              className="category-card category-card-button"
              onClick={() =>
                openWorkersBySkill(
                  "baker"
                )
              }
              disabled={
                user?.role ===
                "worker"
              }
            >
              <div>
                🍰
              </div>

              <h3>
                {t(
                  "baker"
                )}
              </h3>

              <p>
                {t(
                  "bakerDescription"
                )}
              </p>
            </button>

            <button
              type="button"
              className="category-card category-card-button"
              onClick={() =>
                openWorkersBySkill(
                  "fast-food"
                )
              }
              disabled={
                user?.role ===
                "worker"
              }
            >
              <div>
                🍕
              </div>

              <h3>
                {t(
                  "fastFood"
                )}
              </h3>

              <p>
                {t(
                  "fastFoodDescription"
                )}
              </p>
            </button>

            <button
              type="button"
              className="category-card category-card-button"
              onClick={() =>
                openWorkersBySkill(
                  "halwai"
                )
              }
              disabled={
                user?.role ===
                "worker"
              }
            >
              <div>
                🍬
              </div>

              <h3>
                {t(
                  "halwai"
                )}
              </h3>

              <p>
                {t(
                  "halwaiDescription"
                )}
              </p>
            </button>
          </div>
        </section>

        {/* =====================================================
            DASHBOARD
        ===================================================== */}

        {user && (
          <DashboardSummary
            user={user}
          />
        )}

        {/* =====================================================
            GUEST
        ===================================================== */}

        {!user && (
          <>
            <FindWorker />

            <FindJobs />
          </>
        )}

        {/* =====================================================
            EMPLOYER
        ===================================================== */}

        {user?.role ===
          "employer" && (
          <>
            <FindWorker />

            <SentRequests />

            <MyJobs />

            <JobPosting />
          </>
        )}

        {/* =====================================================
            WORKER
        ===================================================== */}

        {user?.role ===
          "worker" && (
          <>
            <FindJobs />

            <MyApplications />

            <ReceivedRequests />

            <WorkerRegistration />
          </>
        )}

        {/* =====================================================
            BOTTOM CTA
        ===================================================== */}

        <section
          className="cta-section"
          id="jobs"
        >
          <div>
            <span>
              {t(
                "readyToGetStarted"
              )}
            </span>

            <h2>
              {t(
                "nextOpportunity"
              )}
            </h2>
          </div>

          {user ? (
            <button
              className="primary-btn"
              type="button"
              onClick={
                user.role ===
                "employer"
                  ? scrollToWorkers
                  : scrollToJobs
              }
            >
              {user.role ===
              "employer"
                ? t(
                    "exploreWorkers"
                  )
                : t(
                    "exploreJobs"
                  )}{" "}

              <span>→</span>
            </button>
          ) : (
            <button
              className="primary-btn"
              type="button"
              onClick={
                goToAuth
              }
            >
              {t(
                "getStarted"
              )}{" "}

              <span>→</span>
            </button>
          )}
        </section>

        {/* =====================================================
            EMPLOYER PROFILE
        ===================================================== */}

        {user?.role ===
          "employer" && (
          <EmployerProfile
            user={user}
          />
        )}
        {/* =====================================================
    CONTACT US
===================================================== */}

<ContactUs />
      </main>
    </div>
  );
}

/* =========================================================
   MAIN APP ROUTES
========================================================= */

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/auth"
            element={<Auth />}
          />

          <Route
            path="/workers/:id"
            element={
              <WorkerProfile />
            }
          />

          <Route
            path="*"
            element={
              <HomePage />
            }
          />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;