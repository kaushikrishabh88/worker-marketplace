import {
  useCallback,
  useEffect,
  useState,
} from "react";

import API_URL from "../api";

function NavBadges({ user, type }) {
  const [count, setCount] =
    useState(0);

  const token =
    localStorage.getItem(
      "workmateToken",
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
            `${API_URL}/api/applications/my`;
        } else if (
          user.role === "worker" &&
          type === "requests"
        ) {
          url =
            `${API_URL}/api/contact-requests/my`;
        }

        /* =====================================================
           EMPLOYER
        ===================================================== */

        else if (
          user.role === "employer" &&
          type === "jobs"
        ) {
          url =
            `${API_URL}/api/jobs/my`;
        } else if (
          user.role === "employer" &&
          type === "requests"
        ) {
          url =
            `${API_URL}/api/contact-requests/sent`;
        }

        if (!url) {
          return 0;
        }

        const response =
          await fetch(
            url,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        let data = {};

        try {
          data =
            await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {
          console.error(
            "Navbar badge request failed:",
            data.message ||
              response.status,
          );

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
                "open") === "open",
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
              "pending",
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
            "pending",
        ).length;
      } catch (error) {
        console.error(
          "Navbar badge error:",
          error,
        );

        return 0;
      }
    }, [
      user,
      token,
      type,
    ]);

  /* =========================================================
     INITIAL FETCH
  ========================================================= */

  useEffect(() => {
    let active = true;

    const loadCount =
      async () => {
        const newCount =
          await fetchCount();

        if (active) {
          setCount(
            newCount,
          );
        }
      };

    const timer =
      setTimeout(
        loadCount,
        0,
      );

    return () => {
      active = false;

      clearTimeout(
        timer,
      );
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

        setCount(
          newCount,
        );
      };

    window.addEventListener(
      "workmate-badges-refresh",
      refreshBadges,
    );

    return () => {
      window.removeEventListener(
        "workmate-badges-refresh",
        refreshBadges,
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