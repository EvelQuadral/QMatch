import React, { useState, useCallback, useEffect } from 'react';
import { useDirectors } from '../data/useDirectors';
import { useTracking } from '../hooks/useTracking';
import Intro from '../screens/Intro';
import Swipe from '../screens/Swipe';
import Matches from '../screens/Matches';

export default function Home() {
  const { deck, loading, error, reshuffle } = useDirectors();
  const track = useTracking();

  const [phase, setPhase] = useState('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedContacts, setLikedContacts] = useState([]);

  // Préchargement des prochaines images (N+1 et N+2)
  useEffect(() => {
    [1, 2].forEach((offset) => {
      const next = deck[currentIndex + offset];
      if (next?.image_full_url) {
        const img = new Image();
        img.src = next.image_full_url;
      }
    });
  }, [currentIndex, deck]);

  const advance = useCallback(() => {
    setCurrentIndex((i) => {
      if (i + 1 >= deck.length) {
        setPhase('matches');
        return i;
      }
      return i + 1;
    });
  }, [deck.length]);

  const handleLike = useCallback(
    (item) => {
      if (!item) return;
      setLikedContacts((prev) => [...prev, item]);
      track(item.id, 'like');
      advance();
    },
    [advance, track]
  );

  const handlePass = useCallback(
    (item) => {
      if (!item) return;
      if (item.type === 'profile') {
        track(item.id, 'pass');
      }
      advance();
    },
    [advance, track]
  );

  const handleTrack = useCallback(
    (id, action) => {
      track(id, action);
    },
    [track]
  );

  const handleStart = () => {
    setPhase('swipe');
  };

  const handleFinish = () => {
    setPhase('matches');
  };

  const handleRestart = () => {
    reshuffle();
    setCurrentIndex(0);
    setLikedContacts([]);
    setPhase('intro');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (loading) {
    return (
      <div className="app-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', color: 'white' }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', opacity: 0.6 }}>Chargement…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-root" style={{ padding: 40, color: 'white', textAlign: 'center' }}>
        Erreur de chargement : {error}
      </div>
    );
  }

  return (
    <div className="app-root">
      {phase === 'intro' && <Intro onStart={handleStart} />}
      {phase === 'swipe' && (
        <Swipe
          deck={deck}
          currentIndex={currentIndex}
          likedContacts={likedContacts}
          onLike={handleLike}
          onPass={handlePass}
          onTrack={handleTrack}
          onFinish={handleFinish}
        />
      )}
      {phase === 'matches' && (
        <Matches
          matches={likedContacts}
          totalSeen={currentIndex + 1}
          onRestart={handleRestart}
          onTrack={handleTrack}
        />
      )}
    </div>
  );
}
