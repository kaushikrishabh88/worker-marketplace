import {
  useEffect,
  useState,
} from "react";

import {
  useToast,
} from "./useToast";

import ProfileAvatar from "./ProfileAvatar";
import API_URL from "../api";

function ReceivedRequests() {
  const toast = useToast();

  const token =
    localStorage.getItem(
      "workmateToken",
    );

  const [
    requests,
    setRequests,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(
    Boolean(token),
  );

  const [
    error,
    setError,
  ] = useState(
    token
      ? ""
      : "Please login as a worker to view requests.",
  );

  const [
    updatingId,
    setUpdatingId,
  ] = useState("");

  /* =========================================================
     FETCH REQUESTS
  ========================================================= */

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchRequests =
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await fetch(
              `${API_URL}/api/contact-requests/my`,
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
            throw new Error(
              data.message ||
                "Failed to load requests.",
            );
          }

          setRequests(
            data.requests || [],
          );
        } catch (error) {
          console.error(
            "Fetch received requests error:",
            error,
          );

          setError(
            error.message ||
              "Unable to load received requests.",
          );
        } finally {
          setLoading(false);
        }
      };

    fetchRequests();
  }, [token]);

  /* =========================================================
     UPDATE STATUS
  ========================================================= */

  const updateStatus =
    async (
      requestId,
      status,
    ) => {
      try {
        setUpdatingId(
          requestId,
        );

        setError("");

        const response =
          await fetch(
            `${API_URL}/api/contact-requests/${requestId}/status`,
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  status,
                }),
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
          throw new Error(
            data.message ||
              "Failed to update request.",
          );
        }

        setRequests(
          (
            previousRequests,
          ) =>
            previousRequests.map(
              (request) =>
                request._id ===
                requestId
                  ? {
                      ...request,
                      status,
                    }
                  : request,
            ),
        );

        window.dispatchEvent(
          new Event(
            "workmate-badges-refresh",
          ),
        );

        toast.success(
          status ===
            "accepted"
            ? "Employer request accepted successfully."
            : "Employer request rejected successfully.",
        );
      } catch (error) {
        console.error(
          "Update request status error:",
          error,
        );

        const message =
          error.message ||
          "Unable to update request.";

        setError(message);

        toast.error(
          message,
        );
      } finally {
        setUpdatingId("");
      }
    };

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section
      className="received-requests"
      id="received-requests"
    >
      <div className="received-requests-heading">
        <span>
          EMPLOYER REQUESTS
        </span>

        <h2>
          Requests from local businesses.
        </h2>

        <p>
          Review employers who are interested in hiring you.
        </p>
      </div>

      {loading ? (
        <div className="request-empty-state">
          <h3>
            Loading requests...
          </h3>
        </div>
      ) : error ? (
        <div className="request-empty-state">
          <h3>
            Unable to load requests
          </h3>

          <p>
            {error}
          </p>
        </div>
      ) : requests.length ===
        0 ? (
        <div className="request-empty-state">
          <div className="request-empty-icon">
            📩
          </div>

          <h3>
            No requests yet
          </h3>

          <p>
            Employer requests will appear here when someone contacts your worker
            profile.
          </p>
        </div>
      ) : (
        <div className="request-list">
          {requests.map(
            (request) => {
              const requestStatus =
                request.status ||
                "pending";

              const isUpdating =
                updatingId ===
                request._id;

              return (
                <article
                  className="request-card"
                  key={
                    request._id
                  }
                >
                  {/* =========================================
                      EMPLOYER
                  ========================================= */}

                  <div className="request-card-top">
                    <ProfileAvatar
                      person={
                        request.employer
                      }
                      fallback="🏢"
                      className="request-employer-icon"
                      alt={
                        request.employer
                          ?.name ||
                        request.employerName ||
                        "Employer"
                      }
                    />

                    <div>
                      <span
                        className={`request-status request-status-${requestStatus}`}
                      >
                        {
                          requestStatus
                        }
                      </span>

                      <h3>
                        {request.employer
                          ?.name ||
                          request.employerName ||
                          "Employer"}
                      </h3>

                      {request
                        .employer
                        ?.email && (
                        <p>
                          ✉️{" "}
                          {
                            request
                              .employer
                              .email
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  {/* =========================================
                      INFO
                  ========================================= */}

                  <div className="request-info">
                    <div>
                      <span>
                        📞 Phone
                      </span>

                      <strong>
                        {request.phone ||
                          "Not available"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        👨‍🍳 Worker
                      </span>

                      <strong>
                        {request
                          .worker
                          ?.name ||
                          "Your Profile"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        📍 Work Location
                      </span>

                      <strong>
                        {request.workLocation ||
                          "Not specified"}
                      </strong>
                    </div>
                  </div>

                  {/* =========================================
                      MESSAGE
                  ========================================= */}

                  <div className="request-message">
                    <span>
                      EMPLOYER MESSAGE
                    </span>

                    <p>
                      {request.message ||
                        "No message provided."}
                    </p>
                  </div>

                  {/* =========================================
                      DATE
                  ========================================= */}

                  <div className="request-date">
                    Received{" "}
                    {new Date(
                      request.createdAt,
                    ).toLocaleString(
                      "en-IN",
                    )}
                  </div>

                  {/* =========================================
                      ACTIONS
                  ========================================= */}

                  {requestStatus ===
                  "pending" ? (
                    <div className="request-actions">
                      <button
                        type="button"
                        className="request-accept-btn"
                        disabled={
                          isUpdating
                        }
                        onClick={() =>
                          updateStatus(
                            request._id,
                            "accepted",
                          )
                        }
                      >
                        {isUpdating
                          ? "Updating..."
                          : "✓ Accept"}
                      </button>

                      <button
                        type="button"
                        className="request-reject-btn"
                        disabled={
                          isUpdating
                        }
                        onClick={() =>
                          updateStatus(
                            request._id,
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
                      className={`request-final-status request-final-${requestStatus}`}
                    >
                      {requestStatus ===
                      "accepted"
                        ? "✓ You accepted this request"
                        : "✕ You rejected this request"}
                    </div>
                  )}
                </article>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}

export default ReceivedRequests;