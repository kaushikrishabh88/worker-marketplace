import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import API_URL from "../api";
import ProfileAvatar from "./ProfileAvatar";
import { useToast } from "./useToast";

function AdminDirectory({ type }) {
  const navigate = useNavigate();
  const toast = useToast();

  const token = localStorage.getItem("workmateToken");

  const storedUser = useMemo(() => {
    try {
      const value =
        localStorage.getItem("workmateUser");

      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }, []);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedEmployer, setSelectedEmployer] =
    useState(null);

  const [moderationTarget, setModerationTarget] =
    useState(null);

  const [moderationMode, setModerationMode] =
    useState("");

  const [moderationLoading, setModerationLoading] =
    useState(false);

  const [messageForm, setMessageForm] = useState({
    type: "notice",
    title: "",
    message: "",
  });

  const [suspensionReason, setSuspensionReason] =
    useState("");

  const [deleteReason, setDeleteReason] =
    useState("");

  const [deleteConfirmation, setDeleteConfirmation] =
    useState("");

  const isWorkers = type === "workers";

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

  const fetchItems = useCallback(async () => {
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
        `${API_URL}/api/admin/${
          isWorkers ? "workers" : "employers"
        }`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Unable to load ${
              isWorkers ? "workers" : "employers"
            }.`,
        );
      }

      setItems(
        isWorkers
          ? data.workers || []
          : data.employers || [],
      );
    } catch (fetchError) {
      console.error(
        "Admin directory fetch error:",
        fetchError,
      );

      setError(
        fetchError.message ||
          "Unable to load accounts.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    isWorkers,
    storedUser,
    token,
  ]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const profile = item.workerProfile;

      const haystack = [
        item.name,
        item.email,
        item.phone,
        item.businessName,
        item.location,
        profile?.name,
        profile?.role,
        profile?.location,
        ...(profile?.skills || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, search]);

  const openModeration = (item, mode) => {
    setModerationTarget(item);
    setModerationMode(mode);

    setMessageForm({
      type: "notice",
      title: "",
      message: "",
    });

    setSuspensionReason("");
    setDeleteReason("");
    setDeleteConfirmation("");
  };

  const closeModeration = () => {
    if (moderationLoading) {
      return;
    }

    setModerationTarget(null);
    setModerationMode("");
    setSuspensionReason("");
    setDeleteReason("");
    setDeleteConfirmation("");
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!moderationTarget?._id) {
      return;
    }

    try {
      setModerationLoading(true);

      const response = await fetch(
        `${API_URL}/api/admin/users/${moderationTarget._id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(messageForm),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to send admin message.",
        );
      }

      toast.success("Message sent successfully.");
      closeModeration();
    } catch (error) {
      console.error("Admin send message error:", error);

      toast.error(
        error.message || "Unable to send message.",
      );
    } finally {
      setModerationLoading(false);
    }
  };

  const handleSuspension = async (suspended) => {
    if (!moderationTarget?._id) {
      return;
    }

    try {
      setModerationLoading(true);

      const response = await fetch(
        `${API_URL}/api/admin/users/${moderationTarget._id}/suspension`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            suspended,
            reason: suspended
              ? suspensionReason
              : "",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to update account status.",
        );
      }

      setItems((previous) =>
        previous.map((item) =>
          item._id === moderationTarget._id
            ? {
                ...item,
                accountStatus:
                  data.user?.accountStatus ||
                  (suspended
                    ? "suspended"
                    : "active"),
                suspensionReason:
                  data.user?.suspensionReason || "",
                suspendedAt:
                  data.user?.suspendedAt || null,
              }
            : item,
        ),
      );

      toast.success(data.message);
      closeModeration();
    } catch (error) {
      console.error(
        "Admin suspension action error:",
        error,
      );

      toast.error(
        error.message ||
          "Unable to update account status.",
      );
    } finally {
      setModerationLoading(false);
    }
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();

    if (!moderationTarget?._id) {
      return;
    }

    try {
      setModerationLoading(true);

      const response = await fetch(
        `${API_URL}/api/admin/users/${moderationTarget._id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reason: deleteReason,
            confirmation: deleteConfirmation,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to permanently delete account.",
        );
      }

      setItems((previous) =>
        previous.filter(
          (item) =>
            item._id !== moderationTarget._id,
        ),
      );

      toast.success(data.message);
      closeModeration();
    } catch (error) {
      console.error(
        "Admin delete account error:",
        error,
      );

      toast.error(
        error.message ||
          "Unable to permanently delete account.",
      );
    } finally {
      setModerationLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("workmateToken");
    localStorage.removeItem("workmateUser");

    navigate("/admin/login", {
      replace: true,
    });
  };

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      },
    );
  };

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

            <small>ADMIN DASHBOARD</small>
          </div>
        </div>

        <div className="admin-dashboard-user">
          <div>
            <strong>
              {storedUser?.name ||
                "Administrator"}
            </strong>

            <small>{storedUser?.email}</small>
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
        <nav className="admin-section-tabs">
          <button
            type="button"
            className={
              isWorkers ? "active" : ""
            }
            onClick={() =>
              navigate("/admin/workers")
            }
          >
            👷 Workers
          </button>

          <button
            type="button"
            className={
              !isWorkers ? "active" : ""
            }
            onClick={() =>
              navigate("/admin/employers")
            }
          >
            🏢 Employers
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/admin/messages")
            }
          >
            📨 Contact Messages
          </button>
        </nav>

        <div className="admin-messages-heading">
          <div>
            <span>
              {isWorkers
                ? "WORKER MANAGEMENT"
                : "EMPLOYER MANAGEMENT"}
            </span>

            <h1>
              {isWorkers
                ? "Workers"
                : "Employers"}
            </h1>

            <p>
              {isWorkers
                ? "Review registered workers and open their full WorkMate profiles."
                : "Review employer accounts, business details and account information."}
            </p>
          </div>

          <button
            type="button"
            className="admin-refresh-btn"
            onClick={fetchItems}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        <div className="admin-directory-summary">
          <div>
            <strong>{items.length}</strong>
            <span>
              Total{" "}
              {isWorkers
                ? "Workers"
                : "Employers"}
            </span>
          </div>

          <div>
            <strong>
              {
                items.filter(
                  (item) =>
                    item.emailVerified,
                ).length
              }
            </strong>

            <span>Email Verified</span>
          </div>

          {isWorkers && (
            <div>
              <strong>
                {
                  items.filter(
                    (item) =>
                      item.workerProfile
                        ?.verified,
                  ).length
                }
              </strong>

              <span>
                Profile Verified
              </span>
            </div>
          )}
        </div>

        <div className="admin-directory-toolbar">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder={
              isWorkers
                ? "Search by name, email, skill or location..."
                : "Search by name, email, business or location..."
            }
          />
        </div>

        {loading ? (
          <div className="admin-message-state">
            Loading{" "}
            {isWorkers
              ? "workers"
              : "employers"}
            ...
          </div>
        ) : error ? (
          <div className="admin-message-state admin-message-state-error">
            <strong>
              Unable to load accounts
            </strong>

            <p>{error}</p>

            <button
              type="button"
              onClick={fetchItems}
            >
              Try Again
            </button>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="admin-message-state">
            No{" "}
            {isWorkers
              ? "workers"
              : "employers"}{" "}
            found.
          </div>
        ) : (
          <div className="admin-directory-grid">
            {visibleItems.map((item) => {
              const profile =
                item.workerProfile;

              return (
                <article
                  className="admin-directory-card"
                  key={item._id}
                >
                  <div className="admin-directory-card-top">
                    <ProfileAvatar
                      person={
                        profile || item
                      }
                      fallback={
                        profile?.emoji ||
                        (isWorkers
                          ? "👷"
                          : "🏢")
                      }
                      className="admin-directory-avatar"
                      alt={item.name}
                    />

                    <div>
                      <h3>
                        {profile?.name ||
                          item.name}
                      </h3>

                      <p>
                        {item.email}
                      </p>
                    </div>
                  </div>

                  <div className="admin-directory-badges">
                    <span
                      className={
                        item.accountStatus === "suspended"
                          ? "suspended"
                          : "active-account"
                      }
                    >
                      {item.accountStatus === "suspended"
                        ? "⛔ Suspended"
                        : "● Active"}
                    </span>

                    <span
                      className={
                        item.emailVerified
                          ? "verified"
                          : "pending"
                      }
                    >
                      {item.emailVerified
                        ? "✓ Email Verified"
                        : "Email Pending"}
                    </span>

                    {isWorkers &&
                      profile && (
                        <span
                          className={
                            profile.verified
                              ? "verified"
                              : "pending"
                          }
                        >
                          {profile.verified
                            ? "✓ Profile Verified"
                            : "Profile Incomplete"}
                        </span>
                      )}
                  </div>

                  <div className="admin-directory-details">
                    {isWorkers ? (
                      <>
                        <p>
                          <strong>
                            Skill:
                          </strong>{" "}
                          {profile?.role ||
                            "No profile"}
                        </p>

                        <p>
                          <strong>
                            Location:
                          </strong>{" "}
                          {profile?.location ||
                            "Not provided"}
                        </p>

                        <p>
                          <strong>
                            Rating:
                          </strong>{" "}
                          ⭐{" "}
                          {Number(
                            profile?.rating ||
                              0,
                          ).toFixed(1)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          <strong>
                            Business:
                          </strong>{" "}
                          {item.businessName ||
                            "Not provided"}
                        </p>

                        <p>
                          <strong>
                            Location:
                          </strong>{" "}
                          {item.location ||
                            "Not provided"}
                        </p>

                        <p>
                          <strong>
                            Phone:
                          </strong>{" "}
                          {item.phone ||
                            "Not provided"}
                        </p>
                      </>
                    )}

                    <p>
                      <strong>
                        Joined:
                      </strong>{" "}
                      {formatDate(
                        item.createdAt,
                      )}
                    </p>
                  </div>

                  <div className="admin-directory-actions">
                    {isWorkers ? (
                      <button
                        type="button"
                        className="admin-directory-primary"
                        disabled={!profile?._id}
                        onClick={() =>
                          profile?._id &&
                          navigate(
                            `/workers/${profile._id}`,
                          )
                        }
                      >
                        {profile?._id
                          ? "View Profile"
                          : "No Worker Profile"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-directory-primary"
                        onClick={() =>
                          setSelectedEmployer(item)
                        }
                      >
                        View Details
                      </button>
                    )}

                    <button
                      type="button"
                      className="admin-directory-message"
                      onClick={() =>
                        openModeration(item, "message")
                      }
                    >
                      ✉ Message
                    </button>

                    <button
                      type="button"
                      className={
                        item.accountStatus === "suspended"
                          ? "admin-directory-restore"
                          : "admin-directory-suspend"
                      }
                      onClick={() =>
                        openModeration(
                          item,
                          item.accountStatus === "suspended"
                            ? "restore"
                            : "suspend",
                        )
                      }
                    >
                      {item.accountStatus === "suspended"
                        ? "✓ Restore"
                        : "⏸ Suspend"}
                    </button>

                    <button
                      type="button"
                      className="admin-directory-delete"
                      onClick={() =>
                        openModeration(item, "delete")
                      }
                    >
                      🗑 Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {moderationTarget && (
        <div
          className="admin-profile-overlay"
          onClick={closeModeration}
        >
          <div
            className="admin-profile-modal admin-moderation-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="admin-profile-close"
              onClick={closeModeration}
              disabled={moderationLoading}
            >
              ×
            </button>

            <span className="admin-profile-label">
              ADMIN ACTION
            </span>

            <h2>
              {moderationMode === "message"
                ? `Message ${moderationTarget.name}`
                : moderationMode === "suspend"
                  ? `Suspend ${moderationTarget.name}`
                  : moderationMode === "restore"
                    ? `Restore ${moderationTarget.name}`
                    : `Delete ${moderationTarget.name}`}
            </h2>

            {moderationMode === "message" && (
              <form
                className="admin-moderation-form"
                onSubmit={handleSendMessage}
              >
                <label>
                  <span>Message Type</span>

                  <select
                    value={messageForm.type}
                    onChange={(event) =>
                      setMessageForm(
                        (previous) => ({
                          ...previous,
                          type: event.target.value,
                        }),
                      )
                    }
                  >
                    <option value="greeting">
                      Greeting
                    </option>

                    <option value="achievement">
                      Achievement
                    </option>

                    <option value="notice">
                      General Notice
                    </option>

                    <option value="warning">
                      Guideline Warning
                    </option>

                    <option value="account-action">
                      Account Action
                    </option>
                  </select>
                </label>

                <label>
                  <span>Title</span>

                  <input
                    type="text"
                    maxLength="120"
                    value={messageForm.title}
                    onChange={(event) =>
                      setMessageForm(
                        (previous) => ({
                          ...previous,
                          title: event.target.value,
                        }),
                      )
                    }
                    placeholder="Example: Congratulations!"
                    required
                  />
                </label>

                <label>
                  <span>Message</span>

                  <textarea
                    rows="6"
                    maxLength="2000"
                    value={messageForm.message}
                    onChange={(event) =>
                      setMessageForm(
                        (previous) => ({
                          ...previous,
                          message: event.target.value,
                        }),
                      )
                    }
                    placeholder="Write the message shown to this user..."
                    required
                  />
                </label>

                <button
                  type="submit"
                  className="admin-moderation-submit"
                  disabled={moderationLoading}
                >
                  {moderationLoading
                    ? "Sending..."
                    : "Send Message"}
                </button>
              </form>
            )}

            {moderationMode === "suspend" && (
              <div className="admin-moderation-form">
                <p className="admin-moderation-warning">
                  Suspension blocks this account from
                  logging in and using protected WorkMate
                  features. Account data is not deleted.
                </p>

                <label>
                  <span>Suspension Reason</span>

                  <textarea
                    rows="5"
                    maxLength="500"
                    value={suspensionReason}
                    onChange={(event) =>
                      setSuspensionReason(
                        event.target.value,
                      )
                    }
                    placeholder="Explain which guideline was violated..."
                  />
                </label>

                <button
                  type="button"
                  className="admin-moderation-danger"
                  disabled={moderationLoading}
                  onClick={() =>
                    handleSuspension(true)
                  }
                >
                  {moderationLoading
                    ? "Suspending..."
                    : "Suspend Account"}
                </button>
              </div>
            )}

            {moderationMode === "restore" && (
              <div className="admin-moderation-form">
                <p>
                  This will restore access to the
                  WorkMate account.
                </p>

                <button
                  type="button"
                  className="admin-moderation-submit"
                  disabled={moderationLoading}
                  onClick={() =>
                    handleSuspension(false)
                  }
                >
                  {moderationLoading
                    ? "Restoring..."
                    : "Restore Account"}
                </button>
              </div>
            )}

            {moderationMode === "delete" && (
              <form
                className="admin-moderation-form"
                onSubmit={handleDeleteAccount}
              >
                <p className="admin-moderation-warning">
                  This permanently deletes the account
                  and related marketplace data. This
                  action cannot be undone.
                </p>

                <label>
                  <span>Deletion Reason</span>

                  <textarea
                    rows="5"
                    maxLength="500"
                    value={deleteReason}
                    onChange={(event) =>
                      setDeleteReason(
                        event.target.value,
                      )
                    }
                    placeholder="Explain why this account must be permanently deleted..."
                    required
                  />
                </label>

                <label>
                  <span>
                    Type DELETE to confirm
                  </span>

                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(event) =>
                      setDeleteConfirmation(
                        event.target.value,
                      )
                    }
                    placeholder="DELETE"
                    required
                  />
                </label>

                <button
                  type="submit"
                  className="admin-moderation-danger"
                  disabled={
                    moderationLoading ||
                    deleteConfirmation !== "DELETE"
                  }
                >
                  {moderationLoading
                    ? "Deleting..."
                    : "Permanently Delete Account"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {selectedEmployer && (
        <div
          className="admin-profile-overlay"
          onClick={() =>
            setSelectedEmployer(null)
          }
        >
          <div
            className="admin-profile-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="admin-profile-close"
              onClick={() =>
                setSelectedEmployer(null)
              }
            >
              ×
            </button>

            <span className="admin-profile-label">
              EMPLOYER PROFILE
            </span>

            <h2>
              {selectedEmployer.name}
            </h2>

            <div className="admin-profile-detail-list">
              <div>
                <span>Email</span>
                <strong>
                  {selectedEmployer.email}
                </strong>
              </div>

              <div>
                <span>
                  Email Status
                </span>
                <strong>
                  {selectedEmployer.emailVerified
                    ? "✓ Verified"
                    : "Not Verified"}
                </strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>
                  {selectedEmployer.phone ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <span>
                  Business Name
                </span>
                <strong>
                  {selectedEmployer.businessName ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <span>Location</span>
                <strong>
                  {selectedEmployer.location ||
                    "Not provided"}
                </strong>
              </div>

              <div className="admin-profile-wide">
                <span>
                  About Business
                </span>
                <p>
                  {selectedEmployer.aboutBusiness ||
                    "No business description provided."}
                </p>
              </div>

              <div>
                <span>Joined</span>
                <strong>
                  {formatDate(
                    selectedEmployer.createdAt,
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminDirectory;
