import React from 'react';
import './Tag.css';

export default function Tag({ children, size = 'md' }) {
  return <span className={`tag tag-${size}`}>{children}</span>;
}
