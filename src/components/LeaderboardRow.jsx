import React from 'react';
import { Copy, Check, Heart, ChevronsDown } from 'lucide-react';
import './LeaderboardRow.css';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * LeaderboardRow — utilisé sur 2 écrans :
 *  - variant="director" : sur /me/:token, compact, highlight si c'est moi (isMe=true)
 *  - variant="admin"    : sur /admin, plus large, avec bouton copier le lien /me
 */
export default function LeaderboardRow({
  variant = 'director',
  rank,
  name,
  imageUrl,
  likes,
  vcards,
  isMe = false,
  copyUrl,
  copied = false,
  onCopy,
}) {
  const initials = getInitials(name);

  if (variant === 'admin') {
    return (
      <div className="lb-row lb-row-admin">
        <span className="lb-rank">{rank}</span>
        <div className="lb-av">
          {imageUrl ? <img src={imageUrl} alt="" /> : <span>{initials}</span>}
        </div>
        <div className="lb-name">{name}</div>
        <div className="lb-stats">
          <span className="lb-stat-likes">
            <Heart size={11} fill="currentColor" /> {likes}
          </span>
          <span className="lb-stat-vcards">
            <ChevronsDown size={11} /> {vcards}
          </span>
        </div>
        {copyUrl && (
          <button
            type="button"
            className="lb-copy"
            onClick={onCopy}
            aria-label={`Copier le lien de ${name}`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
    );
  }

  // director variant
  return (
    <div className={`lb-row lb-row-director ${isMe ? 'is-me' : ''}`}>
      <span className="lb-rank">{rank}</span>
      <div className="lb-av">
        {imageUrl ? <img src={imageUrl} alt="" /> : <span>{initials}</span>}
      </div>
      <div className="lb-name">{name}</div>
      <div className="lb-count">
        {likes} <Heart size={11} fill="currentColor" />
      </div>
    </div>
  );
}
