import React, { useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, type = 'info', onDone, duration = 1800 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onDone]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
    </div>
  );
}
