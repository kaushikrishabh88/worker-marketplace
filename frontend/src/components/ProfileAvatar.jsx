import {
  useMemo,
  useState,
} from "react";

import API_URL from "../api";

function ProfileAvatar({
  person,
  fallback = "👤",
  className = "",
  alt = "Profile",
}) {
  const [
    failedUrl,
    setFailedUrl,
  ] = useState("");

  const imageUrl = useMemo(() => {
    if (person?.avatarUrl) {
      if (
        person.avatarUrl.startsWith(
          "http"
        )
      ) {
        return person.avatarUrl;
      }

      return `${API_URL}${person.avatarUrl}`;
    }

    if (person?.avatarFileId) {
      return `${API_URL}/api/avatars/${person.avatarFileId}`;
    }

    return "";
  }, [
    person?.avatarUrl,
    person?.avatarFileId,
  ]);

  const shouldShowImage =
    Boolean(imageUrl) &&
    failedUrl !== imageUrl;

  return (
    <div
      className={`profile-avatar-shell ${className}`}
    >
      {shouldShowImage ? (
        <img
          className="profile-avatar-img"
          src={imageUrl}
          alt={alt}
          onError={() =>
            setFailedUrl(
              imageUrl
            )
          }
        />
      ) : (
        <span className="profile-avatar-fallback">
          {fallback}
        </span>
      )}
    </div>
  );
}

export default ProfileAvatar;