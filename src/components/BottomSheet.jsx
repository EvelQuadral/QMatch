import React, { useEffect } from 'react';
import { ArrowUp, ArrowRight } from 'lucide-react';
import MatchRow from './MatchRow';
import { downloadVCard } from '../lib/vcard';
import './BottomSheet.css';

export default function BottomSheet({
  open,
  onClose,
  matches = [],
  currentIndex,
  totalCards,
  onContinue,
  onFinish,
  onAction,
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const contactsCount = matches.filter((m) => m.type !== 'pub').length;

  const handleAction = (contact) => {
    if (contact.type === 'pub') {
      window.open(contact.cta_url, '_blank', 'noopener,noreferrer');
    } else {
      downloadVCard(contact);
    }
    onAction?.(contact);
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div>
            <div className="sheet-title">Tes matches</div>
            <div className="sheet-sub">
              {contactsCount} contact{contactsCount > 1 ? 's' : ''} à récupérer
            </div>
          </div>
          <div className="sheet-progress">
            {currentIndex + 1} / {totalCards} vu{currentIndex + 1 > 1 ? 's' : ''}
          </div>
        </div>

        <div className="sheet-list">
          {matches.length === 0 ? (
            <div className="sheet-empty">Pas encore de match. Continue à swiper !</div>
          ) : (
            matches.map((m) => <MatchRow key={m.id} contact={m} onAction={handleAction} />)
          )}
        </div>

        <div className="sheet-footer">
          <button type="button" className="sheet-btn sheet-btn-ghost" onClick={onContinue}>
            <ArrowUp size={15} />
            <span>Continuer</span>
          </button>
          <button type="button" className="sheet-btn sheet-btn-primary" onClick={onFinish}>
            <span>Terminer</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </>
  );
}
