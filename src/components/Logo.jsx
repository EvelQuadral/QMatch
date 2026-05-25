import React from 'react';
import './Logo.css';

export default function Logo({ size = 'md' }) {
  return (
    <div className={`logo logo-${size}`}>
      <span>LOGO</span>
    </div>
  );
}
