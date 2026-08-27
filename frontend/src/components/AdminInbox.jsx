import {
  useCallback,
  useEffect,
  useState,
} from "react";

import API_URL from "../api";
import { useToast } from "./useToast";

const TYPE_LABELS = {
  greeting: "Greeting",
  achievement: "Achievement",
  notice: "Notice",
  warning: "Warning",
  "account-action": "Account Action",
};

const TYPE_ICONS = {
  greeting: "👋",
  achievement: "🏆",
  notice: "📢",
  warning: "⚠️",
  "account-action": "🛡️",
};

function AdminInbox() {
  const toast = useToast();

  const token =
    localStorage.getItem("workmateToken");

  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedMessage, setSelectedMessage] =
    useState(null);

  const [deletingId, setDeletingId] =
    useState(null);

  const fetchMessages = useCallback(async () => {
    if (!token) {
      setMessages([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/admin-messages/me`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        if (data.accountSuspended) {
          throw new Error(
            data.reason ||
              data.message ||
              "Your account is suspended.",
          );
        }

        throw new Error(
          data.message ||
            "Unable to load admin messages.",
        );
      }

      setMessages(data.messages || []);

      setUnreadCount(
        Number(data.unreadCount || 0),
      );
    } catch (fetchError) {
      console.error(
        "Admin inbox error:",
        fetchError,
      );

      setError(
        fetchError.message ||
          "Unable to load admin messages.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const openMessage = async (message) => {
    setSelectedMessage(message);

    if (message.read || !token) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/admin-messages/${message._id}/read`,
        {
          method: "PATCH",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to mark message as read.",
        );
      }

      setMessages((previous) =>
        previous.map((item) =>
          item._id === message._id
            ? {
                ...item,
                read: true,
                readAt:
                  data.adminMessage
                    ?.readAt ||
                  new Date().toISOString(),
              }
            : item,
        ),
      );

      setSelectedMessage(
        (previous) =>
          previous
            ? {
                ...previous,
                read: true,
                readAt:
                  data.adminMessage
                    ?.readAt ||
                  new Date().toISOString(),
              }
            : previous,
      );

      setUnreadCount((previous) =>
        Math.max(0, previous - 1),
      );
    } catch (readError) {
      console.error(
        "Admin message read error:",
        readError,
      );
    }
  };

  const deleteMessage = async (
    message,
  ) => {
    if (
      !message?._id ||
      !token
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${message.title}" from your inbox?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        message._id,
      );

      const response =
        await fetch(
          `${API_URL}/api/admin-messages/${message._id}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to delete admin message.",
        );
      }

      setMessages(
        (previous) => {
          const remaining =
            previous.filter(
              (item) =>
                item._id !==
                message._id,
            );

          setUnreadCount(
            remaining.filter(
              (item) =>
                !item.read,
            ).length,
          );

          return remaining;
        },
      );

      setSelectedMessage(null);

      toast.success(
        "Message removed from your inbox.",
      );
    } catch (deleteError) {
      console.error(
        "Delete admin inbox message error:",
        deleteError,
      );

      toast.error(
        deleteError.message ||
          "Unable to delete admin message.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) {
      return "";
    }

    return new Date(value).toLocaleString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      },
    );
  };

  return (
    <section
      className="admin-inbox-section"
      id="admin-messages"
    >
      <div className="admin-inbox-heading">
        <div>
          <span className="admin-inbox-eyebrow">
            WORKMATE ADMIN
          </span>

          <h2>
            Admin Messages
            {unreadCount > 0 && (
              <span className="admin-inbox-count">
                {unreadCount}
              </span>
            )}
          </h2>

          <p>
            Important notices, greetings,
            achievements and account updates
            from the WorkMate team.
          </p>
        </div>

        <button
          type="button"
          className="admin-inbox-refresh"
          onClick={fetchMessages}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="admin-inbox-state">
          Loading admin messages...
        </div>
      ) : error ? (
        <div className="admin-inbox-state admin-inbox-error">
          <strong>
            Unable to load messages
          </strong>

          <p>{error}</p>

          <button
            type="button"
            onClick={fetchMessages}
          >
            Try Again
          </button>
        </div>
      ) : messages.length === 0 ? (
        <div className="admin-inbox-empty">
          <div>📭</div>

          <h3>No admin messages</h3>

          <p>
            You do not have any notices from
            WorkMate administration right now.
          </p>
        </div>
      ) : (
        <div className="admin-inbox-list">
          {messages.map((message) => (
            <button
              type="button"
              key={message._id}
              className={`admin-inbox-card ${
                message.read
                  ? "read"
                  : "unread"
              } admin-inbox-${message.type}`}
              onClick={() =>
                openMessage(message)
              }
            >
              <div className="admin-inbox-card-icon">
                {TYPE_ICONS[
                  message.type
                ] || "📢"}
              </div>

              <div className="admin-inbox-card-content">
                <div className="admin-inbox-card-top">
                  <span>
                    {TYPE_LABELS[
                      message.type
                    ] || "Notice"}
                  </span>

                  {!message.read && (
                    <strong>
                      NEW
                    </strong>
                  )}
                </div>

                <h3>
                  {message.title}
                </h3>

                <p>
                  {message.message}
                </p>

                <small>
                  {formatDate(
                    message.createdAt,
                  )}
                </small>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedMessage && (
        <div
          className="admin-inbox-overlay"
          onClick={() =>
            setSelectedMessage(null)
          }
        >
          <article
            className={`admin-inbox-modal admin-inbox-${selectedMessage.type}`}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="admin-inbox-close"
              onClick={() =>
                setSelectedMessage(null)
              }
            >
              ×
            </button>

            <div className="admin-inbox-modal-icon">
              {TYPE_ICONS[
                selectedMessage.type
              ] || "📢"}
            </div>

            <span className="admin-inbox-modal-type">
              {TYPE_LABELS[
                selectedMessage.type
              ] || "Notice"}
            </span>

            <h2>
              {selectedMessage.title}
            </h2>

            <p className="admin-inbox-modal-message">
              {selectedMessage.message}
            </p>

            <div className="admin-inbox-modal-footer">
              <span>
                From WorkMate Administration
              </span>

              <small>
                {formatDate(
                  selectedMessage.createdAt,
                )}
              </small>
            </div>

            <div className="admin-inbox-modal-actions">
              <button
                type="button"
                className="admin-inbox-done-btn"
                onClick={() =>
                  setSelectedMessage(null)
                }
                disabled={
                  deletingId ===
                  selectedMessage._id
                }
              >
                Close
              </button>

              <button
                type="button"
                className="admin-inbox-delete-btn"
                onClick={() =>
                  deleteMessage(
                    selectedMessage,
                  )
                }
                disabled={
                  deletingId ===
                  selectedMessage._id
                }
              >
                {deletingId ===
                selectedMessage._id
                  ? "Deleting..."
                  : "🗑 Delete Message"}
              </button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

export default AdminInbox;
