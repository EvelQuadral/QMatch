import React, { useEffect, useRef, useState } from 'react';
import './StatCounter.css';

export default function StatCounter({ value, label, color = 'white' }) {
  const [bumping, setBumping] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value && prev.current !== undefined) {
      setBumping(true);
      const t = setTimeout(() => setBumping(false), 280);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);

  return (
    <div className="stat-box">
      <span className={`stat-n stat-${color} ${bumping ? 'bumping' : ''}`}>{value ?? 0}</span>
      <div className="stat-l">{label}</div>
    </div>
  );
}
