import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Logo from '../components/Logo';
import CounterPill from '../components/CounterPill';
import MatchRow from '../components/MatchRow';
import ProfileOverlay from '../components/ProfileOverlay';
import FeedbackBlock from '../components/FeedbackBlock';
import { downloadVCard } from '../lib/vcard';
import './Matches.css';

export default function Matches({ matches = [], totalSeen, onRestart, onTrack }) {
  const [overlayContact, setOverlayContact] = useState(null);

  const profiles = matches.filter((m) => m.type !== 'pub');
  const pubs = matches.filter((m) => m.type === 'pub');

  const isEmpty = matches.length === 0;

  const handleRowAction = (contact) => {
    if (contact.type === 'pub') {
      window.open(contact.cta_url, '_blank', 'noopener,noreferrer');
      onTrack?.(contact.id, 'pub_click');
    } else {
      downloadVCard(contact);
      onTrack?.(contact.id, 'vcard');
    }
  };

  const handleRowTap = (contact) => {
    if (contact.type === 'pub') {
      window.open(contact.cta_url, '_blank', 'noopener,noreferrer');
      onTrack?.(contact.id, 'pub_click');
      return;
    }
    setOverlayContact(contact);
  };

  const handleOverlayVcard = (contact) => {
    onTrack?.(contact.id, 'vcard');
  };

  return (
    <div className="matches">
      <header className="matches-header">
        <Logo />
        <CounterPill count={matches.length} />
      </header>

      <div className="matches-body">
        <div className="matches-title-wrap">
          <h1 className="matches-title">
            {isEmpty ? 'Vous êtes difficile à séduire !' : 'Voilà votre carnet d’adresses.'}
          </h1>
          <p className="matches-subtitle">
            {isEmpty
              ? 'Pas de match cette fois — c’est l’occasion de recommencer.'
              : `${profiles.length} contact${profiles.length > 1 ? 's' : ''} à récupérer · ${totalSeen} carte${totalSeen > 1 ? 's vues' : ' vue'}`}
          </p>
        </div>

        {profiles.length > 0 && (
          <section>
            <div className="matches-section-label">Vos contacts</div>
            <div className="matches-list">
              {profiles.map((m) => (
                <MatchRow
                  key={m.id}
                  contact={m}
                  onAction={handleRowAction}
                  onTap={handleRowTap}
                />
              ))}
            </div>
          </section>
        )}

        {pubs.length > 0 && (
          <section>
            <div className="matches-section-label">Services à découvrir</div>
            <div className="matches-list">
              {pubs.map((m) => (
                <MatchRow
                  key={m.id}
                  contact={m}
                  onAction={handleRowAction}
                  onTap={handleRowTap}
                />
              ))}
            </div>
          </section>
        )}

        <FeedbackBlock />

        <button
          type="button"
          className={`matches-restart ${isEmpty ? 'restart-primary' : ''}`}
          onClick={onRestart}
        >
          <RefreshCw size={14} />
          <span>Recommencer</span>
        </button>
      </div>

      <ProfileOverlay
        open={overlayContact !== null}
        contact={overlayContact}
        onClose={() => setOverlayContact(null)}
        onVcard={handleOverlayVcard}
      />
    </div>
  );
}
