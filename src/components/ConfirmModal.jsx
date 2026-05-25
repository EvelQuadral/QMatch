import React from 'react';
import './ConfirmModal.css';

export default function ConfirmModal({
  open,
  title,
  body,
  cancelLabel = 'Annuler',
  confirmLabel = 'Confirmer',
  variant = 'danger',
  onCancel,
  onConfirm,
  children,
  disabled = false,
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{title}</h2>
        {body && <p className="modal-body">{body}</p>}
        {children}
        <div className="modal-actions">
          <button type="button" className="modal-btn modal-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`modal-btn modal-${variant}`}
            onClick={onConfirm}
            disabled={disabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
