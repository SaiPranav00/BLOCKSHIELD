import React from 'react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className="toast-floating-container" role="status" aria-live="polite">
      <div className={`toast-card toast-${toast.type || 'info'}`}>
        <span className="toast-icon">
          {toast.type === 'error' ? '❌' : toast.type === 'success' ? '✅' : 'ℹ️'}
        </span>
        <span className="toast-message">{toast.message}</span>
        {onClose && (
          <button
            type="button"
            className="toast-close-btn"
            onClick={onClose}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
