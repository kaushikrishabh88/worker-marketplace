const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD
    ? ""
    : "http://localhost:5000");

export default API_URL;

/* =========================================================
   GLOBAL SUSPENDED ACCOUNT RESPONSE DETECTOR
========================================================= */

if (
  typeof window !== "undefined" &&
  !window.__workmateSuspensionFetchInstalled
) {
  window.__workmateSuspensionFetchInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    if (response.status === 403) {
      try {
        const data = await response.clone().json();

        if (data?.accountSuspended) {
          window.dispatchEvent(
            new CustomEvent(
              "workmate:account-suspended",
              {
                detail: {
                  message: data.message,
                  reason: data.reason,
                },
              },
            ),
          );
        }
      } catch {
        // Non-JSON 403 responses are handled normally.
      }
    }

    return response;
  };
}
