import React, { useState } from 'react';
import { useSwipe } from '../hooks/useSwipe';
import { downloadVCard } from '../lib/vcard';

function StatsBlock({ stats }) {
  if (!stats || !Array.isArray(stats) || stats.length === 0) return null;
  return (
    <div className="stats-container">
      {stats.map((item, i) => (
        <div key={i} className="stat-item">
          <div className="stat-number">{item.number}</div>
          <div className="stat-subtitle">{item.subtitle}</div>
        </div>
      ))}
    </div>
  );
}

export default function SwipeCard({ director, onLike, onPass, onDetails, onVcard }) {
  const [showDetails, setShowDetails] = useState(false);

  const { handlers, cardStyle, likeOpacity, passOpacity } = useSwipe({
    onLike: () => {
      setShowDetails(false);
      onLike?.();
    },
    onPass: () => {
      setShowDetails(false);
      onPass?.();
    },
    disabled: showDetails,
  });

  if (!director) return null;

  const toggleDetails = () => {
    const next = !showDetails;
    setShowDetails(next);
    if (next) onDetails?.();
  };

  const handleVcard = () => {
    downloadVCard(director);
    onVcard?.();
  };

  return (
    <div className="card-container">
      <div className="card" style={cardStyle} {...handlers}>
        <div className="card-image">
          <img src={director.image_full_url} alt={director.name} />

          {director.type === 'profile' && (
            <div className="info-btn" onClick={toggleDetails}>
              <span>i</span>
            </div>
          )}

          <div className="like-overlay" style={{ opacity: likeOpacity }}>
            INTÉRESSÉ
          </div>
          <div className="pass-overlay" style={{ opacity: passOpacity }}>
            PASSER
          </div>
        </div>

        {director.type === 'profile' && (
          <div className={`card-info ${showDetails ? 'details-mode' : ''}`}>
            {showDetails ? (
              <div className="details-content">
                <div className="details-text">
                  <StatsBlock stats={director.stats} />
                </div>
                <button className="vcard-btn" onClick={handleVcard}>
                  Ajouter le contact
                </button>
              </div>
            ) : (
              <>
                <h2>{director.name}</h2>
                <p>{director.description}</p>
                <div className="tags">
                  {(director.tags || []).map((tag, i) => (
                    <span key={i} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="buttons">
        <div className="pass-btn" onClick={onPass}>
          <img src="/dislike.svg" alt="Dislike" className="dislike-icon" />
        </div>
        <div className="like-btn" onClick={onLike}>
          <img src="/like.svg" alt="Like" className="like-icon" />
        </div>
      </div>
    </div>
  );
}
