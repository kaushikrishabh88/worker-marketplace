import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./SavedWorkers.css";

import API_URL from "../api";
import ProfileAvatar from "./ProfileAvatar";
import { useToast } from "./useToast";

function SavedWorkers() {
  const navigate = useNavigate();
  const toast = useToast();

  const token = localStorage.getItem("workmateToken");

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState("");

  const fetchSavedWorkers = useCallback(async () => {
    if (!token) {
      setWorkers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/saved-workers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load saved workers.",
        );
      }

      setWorkers(data.workers || []);
    } catch (fetchError) {
      console.error(
        "Saved workers fetch error:",
        fetchError,
      );

      setError(
        fetchError.message ||
          "Unable to load saved workers.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSavedWorkers();
  }, [fetchSavedWorkers]);

  const handleRemove = async (workerId) => {
    if (!workerId || removingId) {
      return;
    }

    try {
      setRemovingId(workerId);

      const response = await fetch(
        `${API_URL}/api/workers/${workerId}/save`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to remove saved worker.",
        );
      }

      setWorkers((previous) =>
        previous.filter(
          (worker) => worker._id !== workerId,
        ),
      );

      toast.success(
        "Worker removed from saved workers.",
      );
    } catch (removeError) {
      console.error(
        "Saved worker remove error:",
        removeError,
      );

      toast.error(
        removeError.message ||
          "Unable to remove saved worker.",
      );
    } finally {
      setRemovingId("");
    }
  };

  return (
    <section
      className="saved-workers-section"
      id="saved-workers"
    >
      <div className="saved-workers-heading">
        <div>
          <span className="saved-workers-eyebrow">
            YOUR SHORTLIST
          </span>

          <h2>Saved Workers</h2>

          <p>
            Keep your preferred workers in one place
            and return to their profiles anytime.
          </p>
        </div>

        {!loading && !error && workers.length > 0 && (
          <span className="saved-workers-count">
            {workers.length} saved
          </span>
        )}
      </div>

      {loading && (
        <div className="saved-workers-state">
          Loading saved workers...
        </div>
      )}

      {!loading && error && (
        <div className="saved-workers-state saved-workers-error">
          <p>{error}</p>

          <button
            type="button"
            onClick={fetchSavedWorkers}
          >
            Try Again
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        workers.length === 0 && (
          <div className="saved-workers-empty">
            <div className="saved-workers-empty-icon">
              ♡
            </div>

            <h3>No saved workers yet</h3>

            <p>
              Open a worker profile and tap
              “Save Worker” to build your shortlist.
            </p>

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("find-workers")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
              }
            >
              Explore Workers
            </button>
          </div>
        )}

      {!loading &&
        !error &&
        workers.length > 0 && (
          <div className="saved-workers-grid">
            {workers.map((worker) => (
              <article
                className="saved-worker-card"
                key={worker._id}
              >
                <div className="saved-worker-main">
                  <ProfileAvatar
                    user={worker}
                    name={worker.name}
                    size="large"
                  />

                  <div className="saved-worker-info">
                    <h3>{worker.name}</h3>

                    <p className="saved-worker-role">
                      {worker.role || "Worker"}
                    </p>

                    {worker.location && (
                      <p className="saved-worker-meta">
                        📍 {worker.location}
                      </p>
                    )}

                    {worker.experience && (
                      <p className="saved-worker-meta">
                        Experience:{" "}
                        {worker.experience}
                      </p>
                    )}

                    <div className="saved-worker-rating">
                      <span>★</span>

                      <strong>
                        {Number(
                          worker.rating || 0,
                        ).toFixed(1)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="saved-worker-actions">
                  <button
                    type="button"
                    className="saved-worker-view"
                    onClick={() =>
                      navigate(
                        `/workers/${worker._id}`,
                      )
                    }
                  >
                    View Profile
                  </button>

                  <button
                    type="button"
                    className="saved-worker-remove"
                    onClick={() =>
                      handleRemove(worker._id)
                    }
                    disabled={
                      removingId === worker._id
                    }
                  >
                    {removingId === worker._id
                      ? "Removing..."
                      : "♥ Remove"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
    </section>
  );
}

export default SavedWorkers;
