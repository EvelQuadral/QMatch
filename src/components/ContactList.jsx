import React from 'react';
import { downloadVCard } from '../lib/vcard';

function PubCard({ contact, onClick }) {
  return (
    <div className={`contact-card ${contact.type === 'pub' ? 'pub-card' : ''}`}>
      {contact.logo_full_url && (
        <img src={contact.logo_full_url} alt={contact.name} className="brs-logo" />
      )}
      <button className="brs-btn" onClick={() => onClick(contact)}>
        {contact.cta_label || 'Voir'}
      </button>
    </div>
  );
}

function ProfileCard({ contact, onVcard }) {
  return (
    <div className="contact-card">
      <img src={contact.image_full_url} alt={contact.name} className="contact-avatar" />
      <div className="contact-info">
        <div className="contact-tags">
          {(contact.tags || []).map((tag, i) => (
            <span key={i} className="contact-tag">
              {tag}
            </span>
          ))}
        </div>
        <div className="contact-text">
          <h3>{contact.name}</h3>
          <p>{contact.title}</p>
        </div>
        <button className="vcard-btn" onClick={() => onVcard(contact)}>
          Ajouter le contact
        </button>
      </div>
    </div>
  );
}

export default function ContactList({ contacts, onPubClick, onVcard, onRestart }) {
  return (
    <div className="contacts-screen">
      <h2>Vos services matchés</h2>
      <div className="contacts-list">
        {contacts.map((contact) =>
          contact.type === 'pub' ? (
            <PubCard key={contact.id} contact={contact} onClick={onPubClick} />
          ) : (
            <ProfileCard
              key={contact.id}
              contact={contact}
              onVcard={(c) => {
                downloadVCard(c);
                onVcard?.(c);
              }}
            />
          )
        )}
      </div>
      <button className="restart-btn" onClick={onRestart}>
        Recommencer
      </button>
    </div>
  );
}
