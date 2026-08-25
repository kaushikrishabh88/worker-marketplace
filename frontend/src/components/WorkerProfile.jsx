import { useCallback, useEffect, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import "./WorkerProfile.css";

import ProfileAvatar from "./ProfileAvatar";
import { useToast } from "./useToast";
import API_URL from "../api";

function WorkerProfile() {
  const { id } = useParams();

  const navigate = useNavigate();

  const toast = useToast();

  const photoInputRef = useRef(null);

  const token = localStorage.getItem("workmateToken");

  const [loggedInUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("workmateUser");

      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Unable to read logged-in user:", error);

      return null;
    }
  });

  /* =========================================================
     PROFILE STATE
  ========================================================= */

  const [worker, setWorker] = useState(null);

  const [loading, setLoading] = useState(true);

  const [profileError, setProfileError] = useState("");

  /* =========================================================
     CONTACT STATE
  ========================================================= */

  const [showContactForm, setShowContactForm] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  const [contactRequest, setContactRequest] = useState(null);

  const [contactStatusLoading, setContactStatusLoading] = useState(false);

  /* =========================================================
     REVIEWS STATE
  ========================================================= */

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewEligible, setReviewEligible] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewDeleting, setReviewDeleting] = useState(false);

  /* =========================================================
     DELETE STATE
  ========================================================= */

  const [deleting, setDeleting] = useState(false);

  /* =========================================================
     EDIT STATE
  ========================================================= */

  const [showEditForm, setShowEditForm] = useState(false);

  const [updating, setUpdating] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);

  const [avatarRemoving, setAvatarRemoving] = useState(false);

  const [editData, setEditData] = useState({
    name: "",
    phone: "",
    role: "",
    experience: "",
    location: "",
    availability: "",
    salary: "",
    description: "",
  });

  /* =========================================================
     FETCH SINGLE WORKER
  ========================================================= */

  const fetchWorkerProfile = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/workers/${id}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load worker profile.");
      }

      setWorker(data.worker);

      return data.worker;
    } catch (error) {
      console.error("Worker profile error:", error);

      throw error;
    }
  }, [id]);

  useEffect(() => {
    const loadWorker = async () => {
      try {
        setLoading(true);
        setProfileError("");

        await fetchWorkerProfile();
      } catch (error) {
        setProfileError(error.message || "Unable to load worker profile.");
      } finally {
        setLoading(false);
      }
    };

    loadWorker();
  }, [id, fetchWorkerProfile]);

  /* =========================================================
   FETCH CURRENT CONTACT REQUEST STATUS
========================================================= */

  useEffect(() => {
    if (!token || !id || loggedInUser?.role !== "employer") {
      return;
    }

    const fetchContactStatus = async () => {
      try {
        setContactStatusLoading(true);

        const response = await fetch(
          `${API_URL}/api/contact-requests/worker/${id}/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to check request status.");
        }

        setContactRequest(data.request || null);
      } catch (error) {
        console.error("Contact status error:", error);

        setContactRequest(null);
      } finally {
        setContactStatusLoading(false);
      }
    };

    fetchContactStatus();
  }, [id, token, loggedInUser?.role]);

  /* =========================================================
     FETCH REVIEWS
  ========================================================= */

  const fetchReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);

      const response = await fetch(
        `${API_URL}/api/workers/${id}/reviews`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load reviews.",
        );
      }

      setReviews(data.reviews || []);

      setWorker((previous) =>
        previous
          ? {
              ...previous,
              rating: data.rating ?? previous.rating ?? 0,
            }
          : previous,
      );
    } catch (error) {
      console.error("Fetch reviews error:", error);
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }

    fetchReviews();
  }, [id, fetchReviews]);

  /* =========================================================
     CHECK REVIEW ELIGIBILITY
  ========================================================= */

  const fetchReviewEligibility = useCallback(async () => {
    if (
      !token ||
      !id ||
      loggedInUser?.role !== "employer"
    ) {
      setReviewEligible(false);
      setExistingReview(null);

      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/workers/${id}/reviews/eligibility`,
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
            "Failed to check review eligibility.",
        );
      }

      setReviewEligible(Boolean(data.eligible));
      setExistingReview(data.existingReview || null);

      if (data.existingReview) {
        setReviewRating(data.existingReview.rating || 5);
        setReviewComment(data.existingReview.comment || "");
      }
    } catch (error) {
      console.error("Review eligibility error:", error);

      setReviewEligible(false);
      setExistingReview(null);
    }
  }, [id, token, loggedInUser?.role]);

  useEffect(() => {
    fetchReviewEligibility();
  }, [fetchReviewEligibility]);

  /* =========================================================
     SAVE REVIEW
  ========================================================= */

  async function handleSaveReview(event) {
    event.preventDefault();

    if (!token) {
      toast.warning("Please login as an Employer.");

      return;
    }

    const cleanComment = reviewComment.trim();

    if (
      reviewRating < 1 ||
      reviewRating > 5
    ) {
      toast.warning("Please choose a rating from 1 to 5.");

      return;
    }

    if (
      cleanComment.length < 3 ||
      cleanComment.length > 500
    ) {
      toast.warning(
        "Review must be between 3 and 500 characters.",
      );

      return;
    }

    try {
      setReviewSaving(true);

      const response = await fetch(
        `${API_URL}/api/workers/${id}/review`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            rating: reviewRating,
            comment: cleanComment,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to save review.",
        );
      }

      setExistingReview(data.review);

      setWorker((previous) =>
        previous
          ? {
              ...previous,
              rating: data.rating ?? previous.rating ?? 0,
            }
          : previous,
      );

      await fetchReviews();
      await fetchReviewEligibility();

      toast.success(
        existingReview
          ? "Review updated successfully!"
          : "Review submitted successfully!",
      );
    } catch (error) {
      console.error("Save review error:", error);

      toast.error(
        error.message || "Unable to save review.",
      );
    } finally {
      setReviewSaving(false);
    }
  }

  /* =========================================================
     DELETE REVIEW
  ========================================================= */

  async function handleDeleteReview() {
    if (!existingReview || !token) {
      return;
    }

    const confirmed = window.confirm(
      "Delete your review for this worker?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setReviewDeleting(true);

      const response = await fetch(
        `${API_URL}/api/workers/${id}/review`,
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
          data.message || "Unable to delete review.",
        );
      }

      setExistingReview(null);
      setReviewRating(5);
      setReviewComment("");

      setWorker((previous) =>
        previous
          ? {
              ...previous,
              rating: data.rating ?? 0,
            }
          : previous,
      );

      await fetchReviews();
      await fetchReviewEligibility();

      toast.success("Review deleted successfully.");
    } catch (error) {
      console.error("Delete review error:", error);

      toast.error(
        error.message || "Unable to delete review.",
      );
    } finally {
      setReviewDeleting(false);
    }
  }

  /* =========================================================
     OPEN EDIT FORM
  ========================================================= */

  function handleOpenEdit() {
    setEditData({
      name: worker?.name || "",

      phone: worker?.phone || "",

      role: worker?.role || "",

      experience: worker?.experience || "",

      location: worker?.location || "",

      availability: worker?.availability || "",

      salary: worker?.salary ?? "",

      description: worker?.description || "",
    });

    setShowEditForm(true);
  }

  /* =========================================================
     CLOSE EDIT FORM
  ========================================================= */

  function handleCloseEdit() {
    if (updating || avatarUploading || avatarRemoving) {
      return;
    }

    setShowEditForm(false);
  }

  /* =========================================================
     EDIT INPUT CHANGE
  ========================================================= */

  function handleEditChange(event) {
    const { name, value } = event.target;

    setEditData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  /* =========================================================
     UPDATE LOCAL USER
  ========================================================= */

  function updateStoredUser(updatedUser) {
    if (!updatedUser) {
      return;
    }

    localStorage.setItem("workmateUser", JSON.stringify(updatedUser));
  }

  /* =========================================================
     CHOOSE PROFILE PHOTO
  ========================================================= */

  function handleChoosePhoto() {
    if (avatarUploading || avatarRemoving) {
      return;
    }

    photoInputRef.current?.click();
  }

  /* =========================================================
     UPLOAD / CHANGE PROFILE PHOTO
  ========================================================= */

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WebP image.");

      return;
    }

    if (file.size > 1024 * 1024) {
      toast.error("Profile photo must be 1 MB or smaller.");

      return;
    }

    if (!token) {
      toast.warning("Please login again.");

      return;
    }

    try {
      setAvatarUploading(true);

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
        throw new Error(data.message || "Unable to update profile photo.");
      }

      if (data.user) {
        updateStoredUser(data.user);
      }

      setWorker((previous) =>
        previous
          ? {
              ...previous,

              avatarFileId:
                data.avatarFileId || data.user?.avatarFileId || null,
            }
          : previous,
      );

      await fetchWorkerProfile();

      toast.success("Profile photo updated successfully!");
    } catch (error) {
      console.error("Worker photo upload error:", error);

      toast.error(error.message || "Unable to update profile photo.");
    } finally {
      setAvatarUploading(false);
    }
  }

  /* =========================================================
     REMOVE PROFILE PHOTO
  ========================================================= */

  async function handleRemovePhoto() {
    if (!worker?.avatarFileId) {
      return;
    }

    const confirmed = window.confirm(
      "Remove your profile photo? Your worker avatar will be shown instead.",
    );

    if (!confirmed) {
      return;
    }

    if (!token) {
      toast.warning("Please login again.");

      return;
    }

    try {
      setAvatarRemoving(true);

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

      if (data.user) {
        updateStoredUser(data.user);
      }

      setWorker((previous) =>
        previous
          ? {
              ...previous,
              avatarFileId: null,
            }
          : previous,
      );

      await fetchWorkerProfile();

      toast.success("Profile photo removed successfully!");
    } catch (error) {
      console.error("Worker photo remove error:", error);

      toast.error(error.message || "Unable to remove profile photo.");
    } finally {
      setAvatarRemoving(false);
    }
  }

  /* =========================================================
     UPDATE WORKER
  ========================================================= */

  async function handleUpdateWorker(event) {
    event.preventDefault();

    if (!token) {
      toast.warning("Please login again.");

      return;
    }

    try {
      setUpdating(true);

      const response = await fetch(`${API_URL}/api/workers/${worker._id}`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          name: editData.name.trim(),

          phone: editData.phone.trim(),

          role: editData.role,

          skills: [editData.role],

          location: editData.location.trim(),

          experience: editData.experience,

          availability: editData.availability,

          salary: Number(editData.salary),

          description: editData.description.trim(),

          emoji: worker.emoji || "👨‍🍳",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update worker profile.");
      }

      setWorker(data.worker);

      setShowEditForm(false);

      toast.success("Worker profile updated successfully!");
    } catch (error) {
      console.error("Update worker error:", error);

      toast.error(error.message || "Unable to update worker profile.");
    } finally {
      setUpdating(false);
    }
  }

  /* =========================================================
     OPEN CONTACT FORM
  ========================================================= */

  function handleOpenContact() {
    const currentToken = localStorage.getItem("workmateToken");

    const storedUser = localStorage.getItem("workmateUser");

    if (!currentToken || !storedUser) {
      toast.warning(
        "Please login or create an Employer account to contact this worker.",
      );

      navigate("/auth");

      return;
    }

    try {
      const currentUser = JSON.parse(storedUser);

      if (currentUser.role !== "employer") {
        toast.warning("Only Employer accounts can contact workers.");

        return;
      }
    } catch (error) {
      console.error("Unable to read logged-in user:", error);

      toast.warning("Please login again to continue.");

      localStorage.removeItem("workmateToken");

      localStorage.removeItem("workmateUser");

      navigate("/auth");

      return;
    }

    setSubmitted(false);

    setShowContactForm(true);
  }

  /* =========================================================
     SUBMIT CONTACT REQUEST
  ========================================================= */

  async function handleSubmit(event) {
    event.preventDefault();

    const currentToken = localStorage.getItem("workmateToken");

    if (!currentToken) {
      toast.warning("Please login as an Employer to contact this worker.");

      return;
    }

    const form = event.target;

    const formData = {
      workerId: worker._id,

      workerName: worker.name,

      name: form.name.value.trim(),

      phone: form.phone.value.trim(),

      workLocation: form.workLocation.value.trim(),

      message: form.message.value.trim(),
    };

    try {
      const response = await fetch(`${API_URL}/api/contact-worker`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${currentToken}`,
        },

        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed.");
      }

      setSubmitted(true);

      setContactRequest(data.request);

      window.dispatchEvent(new Event("workmate-badges-refresh"));

      toast.success("Contact request sent successfully!");
    } catch (error) {
      console.error("Contact request error:", error);

      toast.error(error.message || "Unable to send request. Please try again.");
    }
  }

  /* =========================================================
     DELETE WORKER
  ========================================================= */

  async function handleDeleteWorker() {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${worker.name}'s profile?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(`${API_URL}/api/workers/${worker._id}`, {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete worker profile.");
      }

      toast.success("Worker profile deleted successfully.");

      navigate("/");
    } catch (error) {
      console.error("Delete worker error:", error);

      toast.error(error.message || "Unable to delete worker profile.");
    } finally {
      setDeleting(false);
    }
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <section className="worker-profile-page">
        <div className="profile-not-found">
          <h1>Loading worker...</h1>

          <p>Please wait while we load the profile.</p>
        </div>
      </section>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (profileError || !worker) {
    return (
      <section className="worker-profile-page">
        <div className="profile-not-found">
          <h1>Worker not found</h1>

          <p>
            {profileError ||
              "The worker profile you are looking for does not exist."}
          </p>

          <button type="button" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>
      </section>
    );
  }

  /* =========================================================
     OWNER CHECK
  ========================================================= */

  const workerUserId =
    typeof worker.user === "object"
      ? worker.user?._id || worker.user?.id
      : worker.user;

  const loggedInUserId = loggedInUser?.id || loggedInUser?._id;

  const isOwner =
    Boolean(loggedInUserId) &&
    Boolean(workerUserId) &&
    String(workerUserId) === String(loggedInUserId);

  const skills = Array.isArray(worker.skills) ? worker.skills : [];

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section className="worker-profile-page">
      {/* =====================================================
          BACK
      ===================================================== */}

      <button
        className="profile-back-btn"
        type="button"
        onClick={() => navigate(-1)}
      >
        ← Back to Workers
      </button>

      {/* =====================================================
          PROFILE CARD
      ===================================================== */}

      <div className="worker-profile-card">
        <ProfileAvatar
          person={worker}
          fallback={worker.emoji || "👨‍🍳"}
          className="profile-avatar"
          alt={worker.name}
        />

        <div className="profile-content">
          <span className="profile-verified">✓ Verified Worker</span>

          <h1>{worker.name}</h1>

          <p className="profile-role">{worker.role}</p>

          <div className="profile-meta">
            <span>📍 {worker.location || "Not specified"}</span>

            <span>💼 {worker.experience || "Not specified"}</span>

            <span>⭐ {worker.rating ?? 0}</span>

            <span>🕒 {worker.availability || "Not specified"}</span>
          </div>

          {/* =================================================
              SKILLS
          ================================================= */}

          {skills.length > 0 && (
            <div className="profile-section">
              <h2>Skills</h2>

              <div className="profile-skills">
                {skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* =================================================
              ABOUT
          ================================================= */}

          {worker.description && (
            <div className="profile-section">
              <h2>About</h2>

              <p className="profile-description">{worker.description}</p>
            </div>
          )}

          {/* =================================================
              SALARY
          ================================================= */}

          <div className="profile-salary">
            <div>
              <small>Expected Salary</small>

              <strong>
                ₹{Number(worker.salary || 0).toLocaleString("en-IN")}
                /month
              </strong>
            </div>

            {/* OWNER KO CONTACT BUTTON NAHI DIKHEGA */}

            {!isOwner && (
              <button
                type="button"
                onClick={handleOpenContact}
                disabled={
                  contactStatusLoading ||
                  contactRequest?.status === "pending" ||
                  contactRequest?.status === "accepted"
                }
              >
                {contactStatusLoading
                  ? "Checking Request..."
                  : contactRequest?.status === "pending"
                    ? "⏳ Request Pending"
                    : contactRequest?.status === "accepted"
                      ? "✓ Request Accepted"
                      : "Contact Worker →"}
              </button>
            )}
          </div>

          {/* =================================================
              PROFILE MANAGEMENT - OWNER ONLY
          ================================================= */}

          {isOwner && (
            <div className="profile-management">
              <div>
                <strong>Manage Your Profile</strong>

                <p>
                  Update your information, profile photo or remove your worker
                  profile.
                </p>
              </div>

              <div className="profile-management-buttons">
                <button
                  className="edit-profile-btn"
                  type="button"
                  onClick={handleOpenEdit}
                >
                  ✏️ Edit Profile
                </button>

                <button
                  className="delete-profile-btn"
                  type="button"
                  onClick={handleDeleteWorker}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "🗑 Delete Profile"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          REVIEWS & RATINGS
      ===================================================== */}

      <div className="worker-reviews-section">
        <div className="worker-reviews-header">
          <div>
            <span className="reviews-eyebrow">
              EMPLOYER FEEDBACK
            </span>

            <h2>Reviews & Ratings</h2>

            <p>
              Feedback from employers who connected with {worker.name}.
            </p>
          </div>

          <div className="reviews-summary">
            <strong>
              ⭐ {Number(worker.rating || 0).toFixed(1)}
            </strong>

            <span>
              {reviews.length}{" "}
              {reviews.length === 1 ? "review" : "reviews"}
            </span>
          </div>
        </div>

        {loggedInUser?.role === "employer" &&
          reviewEligible && (
            <form
              className="worker-review-form"
              onSubmit={handleSaveReview}
            >
              <div className="review-form-heading">
                <div>
                  <strong>
                    {existingReview
                      ? "Update your review"
                      : "Rate this worker"}
                  </strong>

                  <p>
                    Share useful feedback about your experience.
                  </p>
                </div>

                {existingReview && (
                  <span className="review-existing-badge">
                    Your review
                  </span>
                )}
              </div>

              <div
                className="review-star-picker"
                aria-label="Choose rating"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={
                      star <= reviewRating
                        ? "review-star active"
                        : "review-star"
                    }
                    onClick={() => setReviewRating(star)}
                    aria-label={`${star} star rating`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                value={reviewComment}
                onChange={(event) =>
                  setReviewComment(event.target.value)
                }
                rows="4"
                maxLength="500"
                placeholder="How was your experience working with this worker?"
                required
              />

              <div className="review-form-footer">
                <small>
                  {reviewComment.length}/500
                </small>

                <div className="review-form-actions">
                  {existingReview && (
                    <button
                      type="button"
                      className="review-delete-btn"
                      onClick={handleDeleteReview}
                      disabled={
                        reviewDeleting || reviewSaving
                      }
                    >
                      {reviewDeleting
                        ? "Deleting..."
                        : "Delete Review"}
                    </button>
                  )}

                  <button
                    type="submit"
                    className="review-save-btn"
                    disabled={
                      reviewSaving || reviewDeleting
                    }
                  >
                    {reviewSaving
                      ? "Saving..."
                      : existingReview
                        ? "Update Review"
                        : "Submit Review"}
                  </button>
                </div>
              </div>
            </form>
          )}

        {loggedInUser?.role === "employer" &&
          !reviewEligible &&
          contactRequest?.status === "accepted" && (
            <div className="review-info-message">
              Review eligibility is being verified.
            </div>
          )}

        <div className="worker-reviews-list">
          {reviewsLoading ? (
            <div className="reviews-empty">
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="reviews-empty">
              <span>⭐</span>

              <strong>No reviews yet</strong>

              <p>
                Verified employer feedback will appear here.
              </p>
            </div>
          ) : (
            reviews.map((review) => (
              <article
                className="worker-review-card"
                key={review._id}
              >
                <div className="worker-review-top">
                  <div>
                    <strong>
                      {review.employerName ||
                        "WorkMate Employer"}
                    </strong>

                    <div className="worker-review-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={
                            star <= review.rating
                              ? "filled"
                              : ""
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  <time>
                    {review.createdAt
                      ? new Date(
                          review.createdAt,
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : ""}
                  </time>
                </div>

                <p>{review.comment}</p>
              </article>
            ))
          )}
        </div>
      </div>

      {/* =====================================================
          EDIT PROFILE MODAL
      ===================================================== */}

      {isOwner && showEditForm && (
        <div className="edit-overlay" onClick={handleCloseEdit}>
          <div
            className="edit-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="edit-close"
              type="button"
              disabled={updating || avatarUploading || avatarRemoving}
              onClick={handleCloseEdit}
            >
              ×
            </button>

            <span className="edit-label">EDIT WORKER</span>

            <h2>Edit Profile</h2>

            <p className="edit-intro">
              Update your worker information and profile photo below.
            </p>

            {/* =============================================
                  PROFILE PHOTO
              ============================================= */}

            <div className="worker-edit-photo-section">
              <ProfileAvatar
                person={worker}
                fallback={worker.emoji || "👨‍🍳"}
                className="worker-edit-avatar"
                alt={worker.name}
              />

              <div className="worker-edit-photo-info">
                <strong>Profile Photo</strong>

                <p>
                  Add a clear photo so local employers can recognise you. If you
                  remove it, your worker avatar will be shown.
                </p>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="worker-edit-photo-input"
                />

                <div className="worker-edit-photo-actions">
                  <button
                    type="button"
                    className="worker-change-photo-btn"
                    onClick={handleChoosePhoto}
                    disabled={avatarUploading || avatarRemoving}
                  >
                    {avatarUploading
                      ? "Uploading..."
                      : worker.avatarFileId
                        ? "📷 Change Photo"
                        : "📷 Add Photo"}
                  </button>

                  {worker.avatarFileId && (
                    <button
                      type="button"
                      className="worker-remove-photo-btn"
                      onClick={handleRemovePhoto}
                      disabled={avatarUploading || avatarRemoving}
                    >
                      {avatarRemoving ? "Removing..." : "Remove Photo"}
                    </button>
                  )}
                </div>

                <small>JPG, PNG or WebP · Maximum 1 MB</small>
              </div>
            </div>

            {/* =============================================
                  EDIT FORM
              ============================================= */}

            <form className="edit-worker-form" onSubmit={handleUpdateWorker}>
              <label>
                Full Name
                <input
                  type="text"
                  name="name"
                  value={editData.name}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label>
                Phone Number
                <input
                  type="tel"
                  name="phone"
                  value={editData.phone}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label>
                Primary Skill
                <select
                  name="role"
                  value={editData.role}
                  onChange={handleEditChange}
                  required
                >
                  <option value="">Select skill</option>

                  <option value="chef">Chef / Cook</option>

                  <option value="baker">Baker</option>

                  <option value="fast-food">Fast Food Specialist</option>

                  <option value="halwai">Halwai</option>

                  <option value="helper">Kitchen Helper</option>
                </select>
              </label>

              <label>
                Experience
                <select
                  name="experience"
                  value={editData.experience}
                  onChange={handleEditChange}
                  required
                >
                  <option value="">Select experience</option>

                  <option value="0-1">0–1 year</option>

                  <option value="1-3">1–3 years</option>

                  <option value="3-5">3–5 years</option>

                  <option value="5+">5+ years</option>
                </select>
              </label>

              <label>
                Location
                <input
                  type="text"
                  name="location"
                  value={editData.location}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label>
                Availability
                <select
                  name="availability"
                  value={editData.availability}
                  onChange={handleEditChange}
                  required
                >
                  <option value="">Select availability</option>

                  <option value="full-time">Full Time</option>

                  <option value="part-time">Part Time</option>

                  <option value="both">Full / Part Time</option>
                </select>
              </label>

              <label>
                Expected Monthly Salary (₹)
                <input
                  type="number"
                  name="salary"
                  min="0"
                  value={editData.salary}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label className="edit-full-field">
                About Your Skills
                <textarea
                  name="description"
                  rows="4"
                  value={editData.description}
                  onChange={handleEditChange}
                  placeholder="Tell businesses about your skills..."
                />
              </label>

              <button
                className="save-profile-btn"
                type="submit"
                disabled={updating || avatarUploading || avatarRemoving}
              >
                {updating ? "Saving Changes..." : "Save Changes →"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          CONTACT MODAL - NOT FOR OWNER
      ===================================================== */}

      {!isOwner && showContactForm && (
        <div
          className="contact-overlay"
          onClick={() => setShowContactForm(false)}
        >
          <div
            className="contact-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="contact-close"
              type="button"
              onClick={() => setShowContactForm(false)}
            >
              ×
            </button>

            {!submitted ? (
              <>
                <span className="contact-label">CONTACT WORKER</span>

                <h2>Contact {worker.name}</h2>

                <p>Send a request to discuss your job opportunity.</p>

                <form onSubmit={handleSubmit}>
                  <label>
                    Your Name
                    <input
                      type="text"
                      name="name"
                      placeholder="Enter your name"
                      required
                    />
                  </label>

                  <label>
                    Mobile Number
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Enter mobile number"
                      required
                    />
                  </label>

                  <label>
                    Work Location
                    <input
                      type="text"
                      name="workLocation"
                      placeholder="Where should the worker come for work?"
                      required
                    />
                  </label>

                  <label>
                    Message
                    <textarea
                      name="message"
                      placeholder="Tell the worker about your requirement..."
                      rows="4"
                      required
                    />
                  </label>

                  <button className="contact-submit" type="submit">
                    Send Request →
                  </button>
                </form>
              </>
            ) : (
              <div className="contact-success">
                <div className="success-icon">✓</div>

                <h2>Request Sent!</h2>

                <p>
                  Your request for {worker.name} has been submitted
                  successfully.
                </p>

                <button type="button" onClick={() => setShowContactForm(false)}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default WorkerProfile;