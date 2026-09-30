import React from 'react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className={`toast is-visible toast-${toast.type || 'info'}`} role="status" aria-live="polite">
      <span>{toast.message}</span>
    </div>
  );
}
