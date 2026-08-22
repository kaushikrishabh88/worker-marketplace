import {
  useCallback,
  useEffect,
  useState,
} from "react";

function NavBadges({ user, type }) {
  const [count, setCount] =
    useState(0);

  const token =
    localStorage.getItem(
      "workmateToken"
    );

  /* =========================================================
     FETCH BADGE COUNT
  ========================================================= */

  const fetchCount =
    useCallback(async () => {
      if (!user || !token) {
        return 0;
      }

      try {
        let url = "";

        /* =====================================================
           WORKER
        ===================================================== */

        if (
          user.role === "worker" &&
          type === "applications"
        ) {
          url =
            "http://localhost:5000/api/applications/my";
        } else if (
          user.role === "worker" &&
          type === "requests"
        ) {
          url =
            "http://localhost:5000/api/contact-requests/my";
        }

        /* =====================================================
           EMPLOYER
        ===================================================== */

        else if (
          user.role === "employer" &&
          type === "jobs"
        ) {
          url =
            "http://localhost:5000/api/jobs/my";
        } else if (
          user.role === "employer" &&
          type === "requests"
        ) {
          url =
            "http://localhost:5000/api/contact-requests/sent";
        }

        if (!url) {
          return 0;
        }

        const response = await fetch(
          url,
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
          return 0;
        }

        /* =====================================================
           EMPLOYER OPEN JOBS
        ===================================================== */

        if (
          user.role === "employer" &&
          type === "jobs"
        ) {
          return (
            data.jobs || []
          ).filter(
            (job) =>
              (job.status ||
                "open") === "open"
          ).length;
        }

        /* =====================================================
           WORKER PENDING APPLICATIONS
        ===================================================== */

        if (
          user.role === "worker" &&
          type === "applications"
        ) {
          return (
            data.applications || []
          ).filter(
            (application) =>
              (application.status ||
                "pending") ===
              "pending"
          ).length;
        }

        /* =====================================================
           PENDING REQUESTS
        ===================================================== */

        return (
          data.requests || []
        ).filter(
          (request) =>
            (request.status ||
              "pending") ===
            "pending"
        ).length;
      } catch (error) {
        console.error(
          "Navbar badge error:",
          error
        );

        return 0;
      }
    }, [user, token, type]);

  /* =========================================================
     INITIAL FETCH
  ========================================================= */

  useEffect(() => {
    let active = true;

    const loadCount = async () => {
      const newCount =
        await fetchCount();

      if (active) {
        setCount(newCount);
      }
    };

    const timer = setTimeout(
      loadCount,
      0
    );

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchCount]);

  /* =========================================================
     INSTANT REFRESH EVENT
  ========================================================= */

  useEffect(() => {
    const refreshBadges =
      async () => {
        const newCount =
          await fetchCount();

        setCount(newCount);
      };

    window.addEventListener(
      "workmate-badges-refresh",
      refreshBadges
    );

    return () => {
      window.removeEventListener(
        "workmate-badges-refresh",
        refreshBadges
      );
    };
  }, [fetchCount]);

  /* =========================================================
     HIDE EMPTY BADGE
  ========================================================= */

  if (count <= 0) {
    return null;
  }

  /* =========================================================
     BADGE
  ========================================================= */

  return (
    <span
      className="nav-count-badge"
      title={`${count} pending`}
    >
      {count > 99
        ? "99+"
        : count}
    </span>
  );
}

export default NavBadges;