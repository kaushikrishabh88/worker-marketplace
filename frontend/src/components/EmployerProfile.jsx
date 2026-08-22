import { useRef, useState } from "react";

import ProfileAvatar from "./ProfileAvatar";
import { useToast } from "./useToast";

const API_URL = "http://localhost:5000";

function EmployerProfile({ user, onUserUpdated }) {
  const toast = useToast();

  const fileInputRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(user);

  const [editing, setEditing] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [removingPhoto, setRemovingPhoto] = useState(false);

  const [deleting, setDeleting] = useState(false);

  // Sirf form/file validation ke inline errors ke liye.
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    businessName: user?.businessName || "",
    location: user?.location || "",
    aboutBusiness: user?.aboutBusiness || "",
  });

  const token = localStorage.getItem("workmateToken");

  /* =========================================================
     UPDATE USER EVERYWHERE
  ========================================================= */

  const updateUserEverywhere = (updatedUser) => {
    setCurrentUser(updatedUser);

    setForm({
      name: updatedUser?.name || "",
      phone: updatedUser?.phone || "",
      businessName: updatedUser?.businessName || "",
      location: updatedUser?.location || "",
      aboutBusiness: updatedUser?.aboutBusiness || "",
    });

    localStorage.setItem("workmateUser", JSON.stringify(updatedUser));

    if (typeof onUserUpdated === "function") {
      onUserUpdated(updatedUser);
    }
  };

  /* =========================================================
     FORM CHANGE
  ========================================================= */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  /* =========================================================
     START EDITING
  ========================================================= */

  const handleEdit = () => {
    setError("");

    setForm({
      name: currentUser?.name || "",
      phone: currentUser?.phone || "",
      businessName: currentUser?.businessName || "",
      location: currentUser?.location || "",
      aboutBusiness: currentUser?.aboutBusiness || "",
    });

    setEditing(true);
  };

  /* =========================================================
     CANCEL EDITING
  ========================================================= */

  const handleCancel = () => {
    setError("");

    setForm({
      name: currentUser?.name || "",
      phone: currentUser?.phone || "",
      businessName: currentUser?.businessName || "",
      location: currentUser?.location || "",
      aboutBusiness: currentUser?.aboutBusiness || "",
    });

    setEditing(false);
  };

  /* =========================================================
     SAVE EMPLOYER PROFILE
  ========================================================= */

  const handleSave = async (event) => {
    event.preventDefault();

    setError("");

    if (!form.name.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!token) {
      toast.error("Please login again.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/api/employer/profile`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          businessName: form.businessName.trim(),
          location: form.location.trim(),
          aboutBusiness: form.aboutBusiness.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update profile.");
      }

      updateUserEverywhere(data.user);

      setEditing(false);

      setError("");

      toast.success("Profile updated successfully.");
    } catch (error) {
      console.error("Employer profile update error:", error);

      toast.error(error.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     CHOOSE PHOTO
  ========================================================= */

  const handleChoosePhoto = () => {
    if (uploading || removingPhoto) {
      return;
    }

    fileInputRef.current?.click();
  };

  /* =========================================================
     UPLOAD / CHANGE PHOTO
  ========================================================= */

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    setError("");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }

    const maxSize = 1024 * 1024;

    if (file.size > maxSize) {
      setError("Photo must be 1 MB or smaller.");
      return;
    }

    if (!token) {
      toast.error("Please login again.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append("avatar", file);

      const response = await fetch(`${API_URL}/api/profile/avatar`, {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to upload profile photo.");
      }

      updateUserEverywhere(data.user);

      setError("");

      toast.success("Profile photo updated successfully.");
    } catch (error) {
      console.error("Employer avatar upload error:", error);

      toast.error(error.message || "Unable to update profile photo.");
    } finally {
      setUploading(false);
    }
  };

  /* =========================================================
     REMOVE PHOTO
  ========================================================= */

  const handleRemovePhoto = async () => {
    if (!currentUser?.avatarFileId) {
      return;
    }

    const confirmed = window.confirm("Remove your profile photo?");

    if (!confirmed) {
      return;
    }

    setError("");

    if (!token) {
      toast.error("Please login again.");
      return;
    }

    try {
      setRemovingPhoto(true);

      const response = await fetch(`${API_URL}/api/profile/avatar`, {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to remove profile photo.");
      }

      updateUserEverywhere(data.user);

      setError("");

      toast.success("Profile photo removed successfully.");
    } catch (error) {
      console.error("Remove employer photo error:", error);

      toast.error(error.message || "Unable to remove profile photo.");
    } finally {
      setRemovingPhoto(false);
    }
  };

  /* =========================================================
     DELETE ACCOUNT
  ========================================================= */

  const handleDeleteAccount = async () => {
    const firstConfirm = window.confirm(
      "Delete your employer account? Your jobs, applications for those jobs and hiring requests will also be deleted.",
    );

    if (!firstConfirm) {
      return;
    }

    const secondConfirm = window.confirm(
      "This cannot be undone. Are you sure you want to permanently delete your account?",
    );

    if (!secondConfirm) {
      return;
    }

    setError("");

    if (!token) {
      toast.error("Please login again.");
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(`${API_URL}/api/employer/account`, {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete account.");
      }

      /*
       * Delete success ke turant baad redirect hota hai.
       * Isliye yahan success toast intentionally nahi dikhaya gaya,
       * warna redirect ke wajah se toast immediately disappear ho jayega.
       */

      localStorage.removeItem("workmateToken");
      localStorage.removeItem("workmateUser");

      window.location.href = "/";
    } catch (error) {
      console.error("Delete employer account error:", error);

      toast.error(error.message || "Unable to delete account.");

      setDeleting(false);
    }
  };

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section className="employer-profile" id="employer-profile">
      <div className="employer-profile-card">
        <div className="employer-profile-heading">
          <span>EMPLOYER PROFILE</span>

          <h2>Your business profile.</h2>

          <p>
            Manage your employer details and profile photo. Workers can use this
            information to recognise your business.
          </p>
        </div>

        <div className="employer-profile-content">
          {/* PHOTO */}

          <div className="employer-profile-avatar-area">
            <ProfileAvatar
              person={currentUser}
              fallback="🏢"
              className="employer-profile-avatar"
              alt={currentUser?.name || "Employer"}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="employer-profile-file-input"
            />

            <button
              type="button"
              className="employer-profile-photo-button"
              onClick={handleChoosePhoto}
              disabled={uploading || removingPhoto}
            >
              {uploading
                ? "Uploading..."
                : currentUser?.avatarFileId
                  ? "📷 Change Photo"
                  : "📷 Add Photo"}
            </button>

            {currentUser?.avatarFileId && (
              <button
                type="button"
                className="employer-profile-remove-photo-button"
                onClick={handleRemovePhoto}
                disabled={uploading || removingPhoto}
              >
                {removingPhoto ? "Removing..." : "Remove Photo"}
              </button>
            )}

            <small>JPG, PNG or WebP · Maximum 1 MB</small>
          </div>

          {/* DETAILS */}

          <div className="employer-profile-details">
            {!editing ? (
              <>
                <div className="employer-profile-field">
                  <span>Full Name</span>

                  <strong>{currentUser?.name || "Not added"}</strong>
                </div>

                <div className="employer-profile-field">
                  <span>Email Address</span>

                  <strong>{currentUser?.email || "Not available"}</strong>
                </div>

                <div className="employer-profile-field">
                  <span>Phone Number</span>

                  <strong>{currentUser?.phone || "Not added"}</strong>
                </div>

                <div className="employer-profile-field">
                  <span>Business / Shop Name</span>

                  <strong>{currentUser?.businessName || "Not added"}</strong>
                </div>

                <div className="employer-profile-field">
                  <span>Location</span>

                  <strong>{currentUser?.location || "Not added"}</strong>
                </div>

                <div className="employer-profile-field">
                  <span>About Business</span>

                  <strong>{currentUser?.aboutBusiness || "Not added"}</strong>
                </div>

                <div className="employer-profile-field">
                  <span>Account Type</span>

                  <strong>Employer</strong>
                </div>

                <button
                  type="button"
                  className="employer-profile-edit-button"
                  onClick={handleEdit}
                >
                  ✏️ Edit Profile
                </button>
              </>
            ) : (
              <form className="employer-profile-form" onSubmit={handleSave}>
                <label>
                  <span>Full Name</span>

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    required
                  />
                </label>

                <label>
                  <span>Email Address</span>

                  <input
                    type="email"
                    value={currentUser?.email || ""}
                    disabled
                  />

                  <small>Email cannot be changed here.</small>
                </label>

                <label>
                  <span>Phone Number</span>

                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                  />
                </label>

                <label>
                  <span>Business / Shop Name</span>

                  <input
                    type="text"
                    name="businessName"
                    value={form.businessName}
                    onChange={handleChange}
                    placeholder="Business or shop name"
                  />
                </label>

                <label>
                  <span>Location</span>

                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="City or area"
                  />
                </label>

                <label>
                  <span>About Business</span>

                  <textarea
                    name="aboutBusiness"
                    value={form.aboutBusiness}
                    onChange={handleChange}
                    placeholder="Tell workers about your business..."
                    rows="5"
                    maxLength="500"
                  />

                  <small>{form.aboutBusiness.length}/500</small>
                </label>

                <div className="employer-profile-form-actions">
                  <button
                    type="submit"
                    className="employer-profile-save-button"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "💾 Save Changes"}
                  </button>

                  <button
                    type="button"
                    className="employer-profile-cancel-button"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {error && (
          <div className="employer-profile-message employer-profile-error">
            {error}
          </div>
        )}

        {/* DANGER ZONE */}

        <div className="employer-profile-danger-zone">
          <div>
            <span>DANGER ZONE</span>

            <h3>Delete Account</h3>

            <p>
              Permanently delete your employer account, posted jobs and related
              hiring data.
            </p>
          </div>

          <button
            type="button"
            className="employer-profile-delete-button"
            onClick={handleDeleteAccount}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "🗑️ Delete Account"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default EmployerProfile;