import {
  useCallback,
  useMemo,
  useState,
} from "react";

import { ToastContext } from "./useToast";

function ToastProvider({ children }) {
  const [toasts, setToasts] =
    useState([]);

  /* =========================================================
     REMOVE TOAST
  ========================================================= */

  const removeToast = useCallback(
    (id) => {
      setToasts((previous) =>
        previous.filter(
          (toast) =>
            toast.id !== id
        )
      );
    },
    []
  );

  /* =========================================================
     SHOW TOAST
  ========================================================= */

  const showToast = useCallback(
    (
      message,
      type = "success",
      duration = 3500
    ) => {
      const id =
        Date.now() +
        Math.random();

      setToasts((previous) => [
        ...previous,
        {
          id,
          message,
          type,
        },
      ]);

      window.setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  /* =========================================================
     TOAST METHODS
  ========================================================= */

  const success = useCallback(
    (message) => {
      showToast(
        message,
        "success"
      );
    },
    [showToast]
  );

  const error = useCallback(
    (message) => {
      showToast(
        message,
        "error"
      );
    },
    [showToast]
  );

  const warning = useCallback(
    (message) => {
      showToast(
        message,
        "warning"
      );
    },
    [showToast]
  );

  const info = useCallback(
    (message) => {
      showToast(
        message,
        "info"
      );
    },
    [showToast]
  );

  /* =========================================================
     CONTEXT VALUE
  ========================================================= */

  const contextValue = useMemo(
    () => ({
      showToast,
      success,
      error,
      warning,
      info,
    }),
    [
      showToast,
      success,
      error,
      warning,
      info,
    ]
  );

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <ToastContext.Provider
      value={contextValue}
    >
      {children}

      <div className="toast-container">
        {toasts.map((toast) => {
          let icon = "i";
          let title = "WorkMate";

          if (
            toast.type === "success"
          ) {
            icon = "✓";
            title = "Success";
          }

          if (
            toast.type === "error"
          ) {
            icon = "!";
            title =
              "Something went wrong";
          }

          if (
            toast.type === "warning"
          ) {
            icon = "⚠";
            title = "Attention";
          }

          return (
            <div
              key={toast.id}
              className={`workmate-toast workmate-toast-${toast.type}`}
            >
              <div className="toast-icon">
                {icon}
              </div>

              <div className="toast-content">
                <strong>
                  {title}
                </strong>

                <p>
                  {toast.message}
                </p>
              </div>

              <button
                className="toast-close"
                type="button"
                aria-label="Close notification"
                onClick={() =>
                  removeToast(
                    toast.id
                  )
                }
              >
                ×
              </button>

              <div className="toast-progress" />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;