import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { useToast } from "./useToast";

const API_URL = "http://localhost:5000";

function AdminMessages() {
  const navigate = useNavigate();
  const toast = useToast();

  const token =
    localStorage.getItem("workmateToken");

  const storedUser = useMemo(() => {
    try {
      const value =
        localStorage.getItem("workmateUser");

      return value
        ? JSON.parse(value)
        : null;
    } catch {
      return null;
    }
  }, []);

  const [messages, setMessages] =
    useState([]);

  const [counts, setCounts] = useState({
    total: 0,
    new: 0,
    read: 0,
    resolved: 0,
  });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [search, setSearch] =
    useState("");

  const [updatingId, setUpdatingId] =
    useState(null);

  const [deletingId, setDeletingId] =
    useState(null);

  /* =========================================================
     AUTH GUARD
  ========================================================= */

  useEffect(() => {
    if (
      !token ||
      storedUser?.role !== "admin"
    ) {
      navigate("/admin/login", {
        replace: true,
      });
    }
  }, [navigate, storedUser, token]);

  /* =========================================================
     CALCULATE COUNTS
  ========================================================= */

  const calculateCounts = useCallback(
    (items) => ({
      total: items.length,

      new: items.filter(
        (item) => item.status === "new",
      ).length,

      read: items.filter(
        (item) => item.status === "read",
      ).length,

      resolved: items.filter(
        (item) =>
          item.status === "resolved",
      ).length,
    }),
    [],
  );

  /* =========================================================
     FETCH MESSAGES
  ========================================================= */

  const fetchMessages =
    useCallback(async () => {
      if (
        !token ||
        storedUser?.role !== "admin"
      ) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/admin/contact-messages`,
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
          throw new Error(
            data.message ||
              "Unable to load contact messages.",
          );
        }

        const items =
          data.messages || [];

        setMessages(items);

        setCounts(
          data.counts ||
            calculateCounts(items),
        );
      } catch (error) {
        console.error(
          "Admin contact messages error:",
          error,
        );

        setError(
          error.message ||
            "Unable to load contact messages.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      calculateCounts,
      storedUser,
      token,
    ]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialMessages = async () => {
      if (
        !token ||
        storedUser?.role !== "admin"
      ) {
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/admin/contact-messages`,
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
          throw new Error(
            data.message ||
              "Unable to load contact messages.",
          );
        }

        if (!isMounted) {
          return;
        }

        const items =
          data.messages || [];

        setMessages(items);

        setCounts(
          data.counts ||
            calculateCounts(items),
        );
      } catch (error) {
        console.error(
          "Admin contact messages error:",
          error,
        );

        if (isMounted) {
          setError(
            error.message ||
              "Unable to load contact messages.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialMessages();

    return () => {
      isMounted = false;
    };
  }, [
    calculateCounts,
    storedUser,
    token,
  ]);

  /* =========================================================
     UPDATE STATUS
  ========================================================= */

  const handleStatusChange = async (
    messageId,
    status,
  ) => {
    try {
      setUpdatingId(messageId);

      const response = await fetch(
        `${API_URL}/api/admin/contact-messages/${messageId}/status`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            status,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to update message.",
        );
      }

      const updated =
        messages.map((message) =>
          message._id === messageId
            ? data.contactMessage
            : message,
        );

      setMessages(updated);

      setCounts(
        calculateCounts(updated),
      );

      toast.success(
        `Message marked as ${status}.`,
      );
    } catch (error) {
      console.error(
        "Update admin message error:",
        error,
      );

      toast.error(
        error.message ||
          "Unable to update message.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* =========================================================
     DELETE MESSAGE
  ========================================================= */

  const handleDelete = async (
    messageId,
  ) => {
    const confirmed =
      window.confirm(
        "Delete this contact message permanently?",
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(messageId);

      const response = await fetch(
        `${API_URL}/api/admin/contact-messages/${messageId}`,
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
            "Unable to delete message.",
        );
      }

      const remaining =
        messages.filter(
          (message) =>
            message._id !== messageId,
        );

      setMessages(remaining);

      setCounts(
        calculateCounts(remaining),
      );

      toast.success(
        "Contact message deleted successfully.",
      );
    } catch (error) {
      console.error(
        "Delete admin message error:",
        error,
      );

      toast.error(
        error.message ||
          "Unable to delete message.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    localStorage.removeItem(
      "workmateToken",
    );

    localStorage.removeItem(
      "workmateUser",
    );

    navigate("/admin/login", {
      replace: true,
    });
  };

  /* =========================================================
     FILTER / SEARCH
  ========================================================= */

  const visibleMessages =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return messages.filter(
        (message) => {
          const matchesFilter =
            filter === "all" ||
            message.status === filter;

          const haystack = [
            message.name,
            message.email,
            message.phone,
            message.subject,
            message.message,
            message.userType,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !query ||
            haystack.includes(query);

          return (
            matchesFilter &&
            matchesSearch
          );
        },
      );
    }, [
      filter,
      messages,
      search,
    ]);

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section className="admin-messages-page">
      <header className="admin-dashboard-header">
        <div className="admin-dashboard-brand">
          <div className="admin-dashboard-logo">
            W
          </div>

          <div>
            <strong>
              Work<span>Mate</span>
            </strong>

            <small>
              ADMIN DASHBOARD
            </small>
          </div>
        </div>

        <div className="admin-dashboard-user">
          <div>
            <strong>
              {storedUser?.name ||
                "Administrator"}
            </strong>

            <small>
              {storedUser?.email}
            </small>
          </div>

          <button
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="admin-messages-main">
        <div className="admin-messages-heading">
          <div>
            <span>
              CONTACT MANAGEMENT
            </span>

            <h1>Contact Messages</h1>

            <p>
              Review messages sent
              through the WorkMate
              Contact Us form.
            </p>
          </div>

          <button
            type="button"
            className="admin-refresh-btn"
            onClick={fetchMessages}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        {/* COUNTS */}

        <div className="admin-message-stats">
          <button
            type="button"
            className={
              filter === "all"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("all")
            }
          >
            <span>📨</span>

            <div>
              <strong>
                {counts.total}
              </strong>

              <small>
                Total Messages
              </small>
            </div>
          </button>

          <button
            type="button"
            className={
              filter === "new"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("new")
            }
          >
            <span>🔔</span>

            <div>
              <strong>
                {counts.new}
              </strong>

              <small>New</small>
            </div>
          </button>

          <button
            type="button"
            className={
              filter === "read"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("read")
            }
          >
            <span>👁️</span>

            <div>
              <strong>
                {counts.read}
              </strong>

              <small>Read</small>
            </div>
          </button>

          <button
            type="button"
            className={
              filter === "resolved"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("resolved")
            }
          >
            <span>✅</span>

            <div>
              <strong>
                {counts.resolved}
              </strong>

              <small>Resolved</small>
            </div>
          </button>
        </div>

        {/* SEARCH */}

        <div className="admin-message-toolbar">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search name, email, subject or message..."
          />

          <span>
            {visibleMessages.length}{" "}
            result
            {visibleMessages.length ===
            1
              ? ""
              : "s"}
          </span>
        </div>

        {/* CONTENT */}

        {loading ? (
          <div className="admin-message-state">
            <div>⏳</div>

            <h3>
              Loading messages...
            </h3>
          </div>
        ) : error ? (
          <div className="admin-message-state admin-message-state-error">
            <div>⚠️</div>

            <h3>
              Unable to load messages
            </h3>

            <p>{error}</p>

            <button
              type="button"
              onClick={fetchMessages}
            >
              Try Again
            </button>
          </div>
        ) : visibleMessages.length ===
          0 ? (
          <div className="admin-message-state">
            <div>📭</div>

            <h3>
              No messages found
            </h3>

            <p>
              No contact messages match
              the current filter.
            </p>
          </div>
        ) : (
          <div className="admin-message-list">
            {visibleMessages.map(
              (message) => {
                const status =
                  message.status ||
                  "new";

                return (
                  <article
                    className={`admin-message-card admin-message-card-${status}`}
                    key={message._id}
                  >
                    <div className="admin-message-card-top">
                      <div className="admin-message-person">
                        <div className="admin-message-avatar">
                          {message.userType ===
                          "worker"
                            ? "👨‍🍳"
                            : message.userType ===
                                "employer"
                              ? "💼"
                              : "👤"}
                        </div>

                        <div>
                          <h3>
                            {message.name}
                          </h3>

                          <p>
                            {message.email}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`admin-message-status admin-message-status-${status}`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="admin-message-meta">
                      <div>
                        <span>
                          📞 Phone
                        </span>

                        <strong>
                          {message.phone}
                        </strong>
                      </div>

                      <div>
                        <span>
                          👤 User Type
                        </span>

                        <strong>
                          {message.userType}
                        </strong>
                      </div>

                      <div>
                        <span>
                          🕐 Received
                        </span>

                        <strong>
                          {new Date(
                            message.createdAt,
                          ).toLocaleString(
                            "en-IN",
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="admin-message-subject">
                      <span>SUBJECT</span>

                      <strong>
                        {message.subject}
                      </strong>
                    </div>

                    <div className="admin-message-body">
                      <span>MESSAGE</span>

                      <p>
                        {message.message}
                      </p>
                    </div>

                    <div className="admin-message-actions">
                      {status !== "new" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              message._id,
                              "new",
                            )
                          }
                          disabled={
                            updatingId ===
                              message._id ||
                            deletingId ===
                              message._id
                          }
                        >
                          🔔 Mark New
                        </button>
                      )}

                      {status !== "read" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              message._id,
                              "read",
                            )
                          }
                          disabled={
                            updatingId ===
                              message._id ||
                            deletingId ===
                              message._id
                          }
                        >
                          👁️ Mark Read
                        </button>
                      )}

                      {status !==
                        "resolved" && (
                        <button
                          type="button"
                          className="admin-resolve-btn"
                          onClick={() =>
                            handleStatusChange(
                              message._id,
                              "resolved",
                            )
                          }
                          disabled={
                            updatingId ===
                              message._id ||
                            deletingId ===
                              message._id
                          }
                        >
                          ✅ Resolve
                        </button>
                      )}

                      <button
                        type="button"
                        className="admin-delete-message-btn"
                        onClick={() =>
                          handleDelete(
                            message._id,
                          )
                        }
                        disabled={
                          updatingId ===
                            message._id ||
                          deletingId ===
                            message._id
                        }
                      >
                        {deletingId ===
                        message._id
                          ? "Deleting..."
                          : "🗑 Delete"}
                      </button>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </main>
    </section>
  );
}

export default AdminMessages;
