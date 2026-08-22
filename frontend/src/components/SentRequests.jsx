import { useEffect, useState } from "react";
import ProfileAvatar from "./ProfileAvatar";

function SentRequests() {
  const token =
    localStorage.getItem("workmateToken");

  const [requests, setRequests] =
    useState([]);

  const [loading, setLoading] =
    useState(Boolean(token));

  const [error, setError] =
    useState(
      token
        ? ""
        : "Please login as an employer to view sent requests."
    );

  /* =========================================================
     FETCH SENT REQUESTS
  ========================================================= */

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchSentRequests = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://localhost:5000/api/contact-requests/sent",
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
              "Failed to load sent requests."
          );
        }

        setRequests(
          data.requests || []
        );
      } catch (error) {
        console.error(
          "Fetch sent requests error:",
          error
        );

        setError(
          error.message ||
            "Unable to load sent requests."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSentRequests();
  }, [token]);

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section
      className="sent-requests"
      id="sent-requests"
    >
      <div className="sent-requests-heading">
        <span>
          HIRING REQUESTS
        </span>

        <h2>
          Track your worker requests.
        </h2>

        <p>
          See which workers you contacted and
          whether they accepted or rejected your
          request.
        </p>
      </div>

      {loading ? (
        <div className="sent-request-empty">
          <h3>
            Loading requests...
          </h3>
        </div>
      ) : error ? (
        <div className="sent-request-empty">
          <h3>
            Unable to load requests
          </h3>

          <p>
            {error}
          </p>
        </div>
      ) : requests.length === 0 ? (
        <div className="sent-request-empty">
          <div className="sent-request-empty-icon">
            📤
          </div>

          <h3>
            No sent requests yet
          </h3>

          <p>
            Requests you send to workers will
            appear here.
          </p>
        </div>
      ) : (
        <div className="sent-request-list">
          {requests.map((request) => {
            const status =
              request.status || "pending";

            let statusMessage =
              "⏳ Waiting for worker response";

            if (status === "accepted") {
              statusMessage =
                "✓ Worker accepted your request";
            }

            if (status === "rejected") {
              statusMessage =
                "✕ Worker rejected your request";
            }

            return (
              <article
                className="sent-request-card"
                key={request._id}
              >
                <div className="sent-request-top">
                  <ProfileAvatar
                    person={request.worker}
                    fallback={
                      request.worker?.emoji ||
                      "👨‍🍳"
                    }
                    className="sent-worker-icon"
                    alt={
                      request.worker?.name ||
                      "Worker"
                    }
                  />

                  <div>
                    <span
                      className={`sent-request-status sent-request-status-${status}`}
                    >
                      {status}
                    </span>

                    <h3>
                      {request.worker?.name ||
                        "Worker"}
                    </h3>

                    <p>
                      {request.worker?.role ||
                        "Worker"}
                    </p>
                  </div>
                </div>

                <div className="sent-request-info">
                  <div>
                    <span>
                      📍 Location
                    </span>

                    <strong>
                      {request.worker?.location ||
                        "Not specified"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      📞 Phone
                    </span>

                    <strong>
                      {request.worker?.phone ||
                        "Not available"}
                    </strong>
                  </div>
                </div>

                <div className="sent-request-message">
                  <span>
                    YOUR MESSAGE
                  </span>

                  <p>
                    {request.message ||
                      "No message provided."}
                  </p>
                </div>

                <div className="sent-request-date">
                  Sent{" "}
                  {new Date(
                    request.createdAt
                  ).toLocaleString(
                    "en-IN"
                  )}
                </div>

                <div
                  className={`sent-request-result sent-request-result-${status}`}
                >
                  {statusMessage}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default SentRequests;