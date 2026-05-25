import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { UserPlus } from 'lucide-react';
import Tag from './Tag';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { downloadVCard } from '../lib/vcard';
import './SwipeCard.css';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function StatsGrid({ stats }) {
  if (!stats || stats.length === 0) {
    return <div className="back-no-stats">Pas de chiffres disponibles.</div>;
  }
  const cols = stats.length === 3 ? 3 : 2;
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, 1fr)` };
  return (
    <div className="stats-grid" style={gridStyle}>
      {stats.map((s, i) => (
        <div key={i} className="stat-box">
          <div className={`stat-n ${i % 2 === 0 ? 'stat-pink' : 'stat-blue'}`}>
            {s.number}
          </div>
          <div className="stat-l">{s.subtitle}</div>
        </div>
      ))}
    </div>
  );
}

function SwipeCardInner({
  director,
  depth = 0,
  cardNumber,
  totalCards,
  onCommit,
  onTap,
  onProgress,
  onDetails,
  onVcard,
  isTop,
  flyDir,
}, ref) {
  const [flipped, setFlipped] = useState(false);
  const isPub = director?.type === 'pub';

  // Reset flip quand on change de carte (top change)
  useEffect(() => {
    setFlipped(false);
  }, [director?.id]);

  const handleTap = () => {
    if (isPub) return;
    const next = !flipped;
    setFlipped(next);
    if (next) onDetails?.();
    onTap?.(next);
  };

  const handleVcardClick = (e) => {
    e.stopPropagation();
    if (!director) return;
    downloadVCard(director);
    onVcard?.();
  };

  const { handlers, dragStyle, drag, flyOut } = useSwipeGesture({
    onCommit,
    onTap: handleTap,
    onProgress,
    disabled: !isTop,
  });

  useImperativeHandle(ref, () => ({ flyOut }), [flyOut]);

  // Déclenchement programmatique depuis parent via prop flyDir
  useEffect(() => {
    if (isTop && flyDir && typeof flyDir.dir === 'number') {
      flyOut(flyDir.dir);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyDir?.ts, isTop]);

  if (!director) return null;

  // Stamps pendant le drag
  const likeOpacity = Math.min(1, Math.max(0, drag.dx / 100));
  const passOpacity = Math.min(1, Math.max(0, -drag.dx / 100));

  // Peek styles selon depth
  let peekStyle = {};
  if (depth === 1) {
    peekStyle = { transform: 'translateY(8px) scale(0.97) rotate(1.5deg)', opacity: 0.7 };
  } else if (depth === 2) {
    peekStyle = { transform: 'translateY(16px) scale(0.94) rotate(-2.5deg)', opacity: 0.4 };
  }

  const combinedStyle = isTop ? dragStyle : peekStyle;
  const zIndex = 100 - depth;

  return (
    <div
      className={`swipe-card ${flipped ? 'flipped' : ''} ${!isTop ? 'is-peek' : ''}`}
      style={{ ...combinedStyle, zIndex }}
      {...(isTop ? handlers : {})}
    >
      <div className="card-inner">
        {/* Face front */}
        <div className="face face-front">
          {isPub ? (
            <PubFace director={director} />
          ) : (
            <ProfileFront
              director={director}
              cardNumber={cardNumber}
              totalCards={totalCards}
            />
          )}

          {isTop && !isPub && (
            <>
              <div className="drag-stamp stamp-like" style={{ opacity: likeOpacity }}>
                AJOUTER
              </div>
              <div className="drag-stamp stamp-pass" style={{ opacity: passOpacity }}>
                PASSER
              </div>
            </>
          )}
          {isTop && isPub && (
            <>
              <div className="drag-stamp stamp-like" style={{ opacity: likeOpacity }}>
                GARDER
              </div>
              <div className="drag-stamp stamp-pass" style={{ opacity: passOpacity }}>
                PASSER
              </div>
            </>
          )}
        </div>

        {/* Face back — uniquement pour les profils */}
        {!isPub && (
          <div className="face face-back">
            <ProfileBack
              director={director}
              onVcardClick={handleVcardClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileFront({ director, cardNumber, totalCards }) {
  return (
    <>
      {director.image_full_url ? (
        <img className="card-photo" src={director.image_full_url} alt={director.name} />
      ) : (
        <div className="card-photo card-photo-fallback">
          <span className="card-photo-initials">{getInitials(director.name)}</span>
        </div>
      )}

      {cardNumber && (
        <div className="card-counter">
          {cardNumber} / {totalCards}
        </div>
      )}

      <div className="card-bottom">
        <h2 className="card-name">{director.name}</h2>
        <p className="card-title">{director.title}</p>
        <div className="card-tags">
          {(director.tags || []).slice(0, 5).map((tag, i) => (
            <Tag key={i}>{tag}</Tag>
          ))}
        </div>
        <div className="card-hint">↑ TAP POUR LES DÉTAILS</div>
      </div>
    </>
  );
}

function ProfileBack({ director, onVcardClick }) {
  return (
    <div className="back-content">
      <div className="back-id">
        <div className="back-id-av">{getInitials(director.name)}</div>
        <div className="back-id-text">
          <div className="back-id-name">{director.name}</div>
          <div className="back-id-title">{director.title}</div>
        </div>
      </div>

      <div className="back-section-label">Quelques chiffres</div>
      <StatsGrid stats={director.stats} />

      {director.description && (
        <>
          <div className="back-section-label">À propos</div>
          <p className="back-quote">« {director.description} »</p>
        </>
      )}

      <button type="button" className="back-cta" onClick={onVcardClick}>
        <UserPlus size={16} strokeWidth={2.2} />
        <span>Ajouter à mes contacts</span>
      </button>

      <div className="back-hint">↓ TAP POUR REVENIR</div>
    </div>
  );
}

const SwipeCard = forwardRef(SwipeCardInner);
export default SwipeCard;

function PubFace({ director }) {
  return (
    <div className="pub-face">
      <div className="pub-blob pub-blob-1" />
      <div className="pub-blob pub-blob-2" />
      <div className="pub-tag">SERVICE</div>
      <div className="pub-center">
        {director.logo_full_url ? (
          <img src={director.logo_full_url} alt={director.name} className="pub-logo" />
        ) : (
          <div className="pub-title">{director.display_title || director.name}</div>
        )}
        {director.subtitle && <div className="pub-subtitle">{director.subtitle}</div>}
      </div>
      <div className="pub-footer">
        <span className="pub-brand">QUADRAL</span>
        <span className="pub-cta-hint">{director.cta_label || 'Voir'} →</span>
      </div>
    </div>
  );
}
