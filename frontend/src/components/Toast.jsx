import React from 'react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className={`toast-notification ${isSuccess ? 'toast-success' : 'toast-error'}`}>
      <div className="toast-content">
        <span className="toast-icon">{isSuccess ? '✓' : '!'}</span>
        <div className="toast-text">
          <strong className="toast-title">{isSuccess ? 'Success' : 'Notice'}</strong>
          <p className="toast-message">{toast.message}</p>
        </div>
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Close notification">&times;</button>
    </div>
  );
}

