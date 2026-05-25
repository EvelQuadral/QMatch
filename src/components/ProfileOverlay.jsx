import React, { useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import Tag from './Tag';
import { downloadVCard } from '../lib/vcard';
import './ProfileOverlay.css';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function StatsGrid({ stats }) {
  if (!stats || stats.length === 0) return null;
  const cols = stats.length === 3 ? 3 : 2;
  return (
    <div className="po-stats" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {stats.map((s, i) => (
        <div key={i} className="po-stat">
          <div className={`po-stat-n ${i % 2 === 0 ? 'po-pink' : 'po-blue'}`}>{s.number}</div>
          <div className="po-stat-l">{s.subtitle}</div>
        </div>
      ))}
    </div>
  );
}

export default function ProfileOverlay({ open, contact, cardNumber, onClose, onVcard }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !contact) return null;

  const handleVcard = () => {
    downloadVCard(contact);
    onVcard?.(contact);
  };

  return (
    <>
      <div className="po-backdrop" onClick={onClose} />
      <div className="po-frame" role="dialog" aria-label={`Fiche de ${contact.name}`}>
        <button type="button" className="po-close" onClick={onClose} aria-label="Fermer">
          <X size={16} />
        </button>

        <div className="po-avatar-wrap">
          <div className="po-avatar">
            {contact.image_full_url ? (
              <img src={contact.image_full_url} alt={contact.name} />
            ) : (
              <span className="po-avatar-initials">{getInitials(contact.name)}</span>
            )}
          </div>
        </div>

        <div className="po-content">
          <h2 className="po-name">{contact.name}</h2>
          <p className="po-title">{contact.title}</p>

          {contact.tags && contact.tags.length > 0 && (
            <div className="po-tags">
              {contact.tags.map((t, i) => (
                <Tag key={i}>{t}</Tag>
              ))}
            </div>
          )}

          {contact.stats && contact.stats.length > 0 && (
            <>
              <div className="po-section-label">Quelques chiffres</div>
              <StatsGrid stats={contact.stats} />
            </>
          )}

          {contact.description && (
            <>
              <div className="po-section-label">À propos</div>
              <p className="po-quote">« {contact.description} »</p>
            </>
          )}
        </div>

        <div className="po-cta-wrap">
          <button type="button" className="po-cta" onClick={handleVcard}>
            <UserPlus size={16} strokeWidth={2.2} />
            <span>Ajouter à mes contacts</span>
          </button>
        </div>
      </div>
    </>
  );
}
