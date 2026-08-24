import { useEffect, useState } from "react";
import ProfileAvatar from "./ProfileAvatar";
import { useToast } from "./useToast";
import API_URL from "../api";

function SentRequests() {
  const toast = useToast();

  const token =
    localStorage.getItem("workmateToken");

  const [requests, setRequests] =
    useState([]);

  const [
    editingRequestId,
    setEditingRequestId,
  ] = useState(null);

  const [editData, setEditData] =
    useState({
      phone: "",
      workLocation: "",
      message: "",
    });

  const [
    savingRequestId,
    setSavingRequestId,
  ] = useState(null);

  const [
    deletingRequestId,
    setDeletingRequestId,
  ] = useState(null);

  const [loading, setLoading] =
    useState(Boolean(token));

  const [error, setError] =
    useState(
      token
        ? ""
        : "Please login as an employer to view sent requests.",
    );

  /* =========================================================
     FETCH SENT REQUESTS
  ========================================================= */

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchSentRequests =
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await fetch(
              `${API_URL}/api/contact-requests/sent`,
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
                "Failed to load sent requests.",
            );
          }

          setRequests(
            data.requests || [],
          );
        } catch (error) {
          console.error(
            "Fetch sent requests error:",
            error,
          );

          setError(
            error.message ||
              "Unable to load sent requests.",
          );
        } finally {
          setLoading(false);
        }
      };

    fetchSentRequests();
  }, [token]);

  /* =========================================================
     OPEN EDIT REQUEST
  ========================================================= */

  function handleOpenEdit(
    request,
  ) {
    if (
      request.status !==
      "pending"
    ) {
      return;
    }

    setEditingRequestId(
      request._id,
    );

    setEditData({
      phone:
        request.phone || "",

      workLocation:
        request.workLocation ||
        "",

      message:
        request.message || "",
    });
  }

  /* =========================================================
     CLOSE EDIT REQUEST
  ========================================================= */

  function handleCloseEdit() {
    setEditingRequestId(
      null,
    );

    setEditData({
      phone: "",
      workLocation: "",
      message: "",
    });
  }

  /* =========================================================
     EDIT INPUT CHANGE
  ========================================================= */

  function handleEditChange(
    event,
  ) {
    const {
      name,
      value,
    } = event.target;

    setEditData(
      (previous) => ({
        ...previous,
        [name]: value,
      }),
    );
  }

  /* =========================================================
     SAVE EDITED REQUEST
  ========================================================= */

  async function handleSaveEdit(
    requestId,
  ) {
    if (
      !editData.phone.trim() ||
      !editData.workLocation.trim() ||
      !editData.message.trim()
    ) {
      toast.warning(
        "Phone, work location and message are required.",
      );

      return;
    }

    try {
      setSavingRequestId(
        requestId,
      );

      const response =
        await fetch(
          `${API_URL}/api/contact-requests/${requestId}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                phone:
                  editData.phone.trim(),

                workLocation:
                  editData.workLocation.trim(),

                message:
                  editData.message.trim(),
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
        (previous) =>
          previous.map(
            (request) =>
              request._id ===
              requestId
                ? {
                    ...request,
                    ...data.request,
                  }
                : request,
          ),
      );

      handleCloseEdit();

      window.dispatchEvent(
        new Event(
          "workmate-badges-refresh",
        ),
      );

      toast.success(
        "Request updated successfully.",
      );
    } catch (error) {
      console.error(
        "Edit contact request error:",
        error,
      );

      toast.error(
        error.message ||
          "Unable to update request.",
      );
    } finally {
      setSavingRequestId(
        null,
      );
    }
  }

  /* =========================================================
     CANCEL SENT REQUEST
  ========================================================= */

  async function handleCancelRequest(
    requestId,
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to cancel this contact request?",
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingRequestId(
        requestId,
      );

      const response =
        await fetch(
          `${API_URL}/api/contact-requests/${requestId}`,
          {
            method:
              "DELETE",

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
            "Failed to cancel request.",
        );
      }

      setRequests(
        (previous) =>
          previous.filter(
            (request) =>
              request._id !==
              requestId,
          ),
      );

      if (
        editingRequestId ===
        requestId
      ) {
        handleCloseEdit();
      }

      window.dispatchEvent(
        new Event(
          "workmate-badges-refresh",
        ),
      );

      toast.success(
        "Request cancelled successfully.",
      );
    } catch (error) {
      console.error(
        "Cancel contact request error:",
        error,
      );

      toast.error(
        error.message ||
          "Unable to cancel request.",
      );
    } finally {
      setDeletingRequestId(
        null,
      );
    }
  }

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
          See which workers you
          contacted and whether
          they accepted or rejected
          your request.
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

          <p>{error}</p>
        </div>
      ) : requests.length ===
        0 ? (
        <div className="sent-request-empty">
          <div className="sent-request-empty-icon">
            📤
          </div>

          <h3>
            No sent requests yet
          </h3>

          <p>
            Requests you send to
            workers will appear
            here.
          </p>
        </div>
      ) : (
        <div className="sent-request-list">
          {requests.map(
            (request) => {
              const status =
                request.status ||
                "pending";

              let statusMessage =
                "⏳ Waiting for worker response";

              if (
                status ===
                "accepted"
              ) {
                statusMessage =
                  "✓ Worker accepted your request";
              }

              if (
                status ===
                "rejected"
              ) {
                statusMessage =
                  "✕ Worker rejected your request";
              }

              return (
                <article
                  className="sent-request-card"
                  key={
                    request._id
                  }
                >
                  <div className="sent-request-top">
                    <ProfileAvatar
                      person={
                        request.worker
                      }
                      fallback={
                        request.worker
                          ?.emoji ||
                        "👨‍🍳"
                      }
                      className="sent-worker-icon"
                      alt={
                        request.worker
                          ?.name ||
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
                        {request.worker
                          ?.name ||
                          "Worker"}
                      </h3>

                      <p>
                        {request.worker
                          ?.role ||
                          "Worker"}
                      </p>
                    </div>
                  </div>

                  <div className="sent-request-info">
                    <div>
                      <span>
                        📍 Work Location
                      </span>

                      <strong>
                        {request.workLocation ||
                          "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        📞 Phone
                      </span>

                      <strong>
                        {request.phone ||
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
                      request.createdAt,
                    ).toLocaleString(
                      "en-IN",
                    )}
                  </div>

                  <div
                    className={`sent-request-result sent-request-result-${status}`}
                  >
                    {
                      statusMessage
                    }
                  </div>

                  {status ===
                    "pending" && (
                    <div className="sent-request-actions">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenEdit(
                            request,
                          )
                        }
                        disabled={
                          savingRequestId ===
                            request._id ||
                          deletingRequestId ===
                            request._id
                        }
                      >
                        ✏️ Edit Request
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleCancelRequest(
                            request._id,
                          )
                        }
                        disabled={
                          savingRequestId ===
                            request._id ||
                          deletingRequestId ===
                            request._id
                        }
                      >
                        {deletingRequestId ===
                        request._id
                          ? "Cancelling..."
                          : "🗑 Cancel Request"}
                      </button>
                    </div>
                  )}

                  {status ===
                    "pending" &&
                    editingRequestId ===
                      request._id && (
                      <div className="sent-request-edit-form">
                        <label>
                          <span>
                            Phone Number
                          </span>

                          <input
                            type="text"
                            name="phone"
                            value={
                              editData.phone
                            }
                            onChange={
                              handleEditChange
                            }
                            disabled={
                              savingRequestId ===
                              request._id
                            }
                          />
                        </label>

                        <label>
                          <span>
                            Work Location
                          </span>

                          <input
                            type="text"
                            name="workLocation"
                            value={
                              editData.workLocation
                            }
                            onChange={
                              handleEditChange
                            }
                            disabled={
                              savingRequestId ===
                              request._id
                            }
                          />
                        </label>

                        <label>
                          <span>
                            Message
                          </span>

                          <textarea
                            name="message"
                            value={
                              editData.message
                            }
                            onChange={
                              handleEditChange
                            }
                            disabled={
                              savingRequestId ===
                              request._id
                            }
                            rows="4"
                          />
                        </label>

                        <div className="sent-request-edit-actions">
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveEdit(
                                request._id,
                              )
                            }
                            disabled={
                              savingRequestId ===
                              request._id
                            }
                          >
                            {savingRequestId ===
                            request._id
                              ? "Saving..."
                              : "✓ Save Changes"}
                          </button>

                          <button
                            type="button"
                            onClick={
                              handleCloseEdit
                            }
                            disabled={
                              savingRequestId ===
                              request._id
                            }
                          >
                            Cancel Edit
                          </button>
                        </div>
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

export default SentRequests;