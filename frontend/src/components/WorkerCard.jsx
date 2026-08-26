import { useNavigate } from "react-router-dom";
import ProfileAvatar from "./ProfileAvatar";

function WorkerCard({ worker }) {
  const navigate = useNavigate();

  const handleViewProfile =
    () => {
      navigate(
        `/workers/${worker._id}`
      );
    };

  return (
    <div className="worker-list-card">
      <ProfileAvatar
        person={worker}
        fallback={
          worker.emoji ||
          "👨‍🍳"
        }
        className="worker-avatar"
        alt={
          worker.name ||
          "Worker"
        }
      />

      <div className="worker-list-info">
        <div className="worker-list-header">
          <div>
            <h3>
              {worker.name}
            </h3>

            <p>
              {worker.role}
            </p>
          </div>

          {worker.verified && (
            <span className="verified-badge">
              ✓ Profile Verified
            </span>
          )}
        </div>

        <div className="worker-tags">
          {Array.isArray(
            worker.skills
          ) &&
            worker.skills.map(
              (skill) => (
                <span key={skill}>
                  {skill}
                </span>
              )
            )}
        </div>

        <div className="worker-meta">
          <span>
            📍{" "}
            {worker.location}
          </span>

          <span>
            💼{" "}
            {worker.experience}
          </span>

          <span>
            ⭐{" "}
            {worker.rating}
          </span>
        </div>

        <div className="worker-card-bottom">
          <strong>
            ₹
            {Number(
              worker.salary || 0
            ).toLocaleString(
              "en-IN"
            )}
            /month
          </strong>

          <button
            type="button"
            onClick={
              handleViewProfile
            }
          >
            View Profile →
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkerCard;