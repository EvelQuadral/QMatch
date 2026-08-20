import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useDirectors } from '../data/useDirectors';
import { useTracking } from '../hooks/useTracking';
import Intro from '../screens/Intro';

// Lazy-load les écrans non-critiques pour alléger le bundle initial.
// On les pré-fetch dès le mount (cf. useEffect plus bas) pour qu'ils soient
// disponibles instantanément au clic "Commencer".
const Swipe = lazy(() => import('../screens/Swipe'));
const Matches = lazy(() => import('../screens/Matches'));

function PhaseLoader() {
  return (
    <div
      style={{
        // 100dvh et non 100vh : sur mobile, la barre d'URL fait varier la hauteur
        // du viewport et 100vh déborde sous la barre. Un repli n'a pas de sens ici,
        // un objet JS ne pouvant pas porter deux fois la même clé.
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        opacity: 0.5,
        fontSize: 18,
      }}
    >
      Préparation des rencontres…
    </div>
  );
}

export default function Home() {
  const { deck, loading, error, reshuffle } = useDirectors();
  const track = useTracking();

  const [phase, setPhase] = useState('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedContacts, setLikedContacts] = useState([]);

  // Pré-fetch les chunks Swipe + Matches dès l'arrivée sur l'app, en arrière-plan.
  // Le visiteur lit l'intro pendant ce temps ; au clic "Commencer", tout est prêt.
  useEffect(() => {
    import('../screens/Swipe');
    import('../screens/Matches');
  }, []);

  // Préchargement immédiat des 3 premières photos dès que le deck arrive
  // (ainsi la 1ère carte affichée est instantanée au clic CTA)
  useEffect(() => {
    if (!deck.length) return;
    [0, 1, 2].forEach((i) => {
      const item = deck[i];
      if (item?.image_full_url) {
        const img = new Image();
        img.src = item.image_full_url;
      }
    });
  }, [deck]);

  // Préchargement continu pendant le swipe (N+1, N+2)
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
      // Profils comme pubs sont trackés : useTracking() aiguille vers la bonne
      // RPC selon l'id. Savoir qu'une pub est systématiquement passée est une
      // information utile pour l'arbitrage des visuels.
      track(item.id, 'pass');
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

  // ⚠️ Plus de blocage par "loading" : on rend l'Intro immédiatement.
  // Le fetch Supabase tourne en arrière-plan pendant que l'utilisateur lit l'intro.
  if (error) {
    return (
      <div className="app-root" style={{ padding: 40, color: 'white', textAlign: 'center', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Erreur de chargement : {error}
      </div>
    );
  }

  return (
    <div className="app-root">
      {phase === 'intro' && <Intro onStart={handleStart} />}

      {phase === 'swipe' && (
        deck.length > 0 ? (
          <Suspense fallback={<PhaseLoader />}>
            <Swipe
              deck={deck}
              currentIndex={currentIndex}
              likedContacts={likedContacts}
              onLike={handleLike}
              onPass={handlePass}
              onTrack={handleTrack}
              onFinish={handleFinish}
            />
          </Suspense>
        ) : (
          <PhaseLoader />
        )
      )}

      {phase === 'matches' && (
        <Suspense fallback={<PhaseLoader />}>
          <Matches
            matches={likedContacts}
            totalSeen={currentIndex + 1}
            onRestart={handleRestart}
            onTrack={handleTrack}
          />
        </Suspense>
      )}
    </div>
  );
}
