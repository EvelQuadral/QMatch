import React from 'react';
import { UserPlus, ExternalLink } from 'lucide-react';
import './MatchRow.css';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function MatchRow({ contact, onAction, onTap }) {
  const isPub = contact.type === 'pub';

  const handleAction = (e) => {
    e.stopPropagation();
    onAction?.(contact);
  };

  return (
    <div className="match-row" onClick={() => onTap?.(contact)}>
      <div className={`match-av ${isPub ? 'match-av-pub' : ''}`}>
        {isPub ? (
          contact.logo_url ? (
            <img src={contact.logo_url} alt="" />
          ) : (
            (contact.name || '?').slice(0, 3).toUpperCase()
          )
        ) : contact.image_full_url ? (
          <img src={contact.image_full_url} alt={contact.name} />
        ) : (
          <span className="match-av-initials">{getInitials(contact.name)}</span>
        )}
      </div>

      <div className="match-text">
        <div className="match-name">{contact.name}</div>
        <div className="match-sub">{isPub ? contact.subtitle || 'Service Quadral' : contact.title}</div>
      </div>

      <button
        type="button"
        className={`match-action ${isPub ? 'match-action-pub' : ''}`}
        onClick={handleAction}
        aria-label={isPub ? 'Ouvrir le lien' : 'Ajouter le contact'}
      >
        {isPub ? <ExternalLink size={14} /> : <UserPlus size={15} />}
      </button>
    </div>
  );
}
