import React, { useState, useEffect } from 'react';
import { useDirectors } from '../data/useDirectors';
import { useTracking } from '../hooks/useTracking';
import { useScrollLock } from '../hooks/useScrollLock';
import IntroScreen from '../components/IntroScreen';
import Header from '../components/Header';
import ProgressBar from '../components/ProgressBar';
import SwipeCard from '../components/SwipeCard';
import ContactList from '../components/ContactList';
import ExplanationOverlay from '../components/ExplanationOverlay';

export default function Home() {
  const { directors, loading, error, reshuffle } = useDirectors();
  const track = useTracking();

  const [showIntro, setShowIntro] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);
  const [showContacts, setShowContacts] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedContacts, setLikedContacts] = useState([]);

  useScrollLock(showIntro || (!showContacts && !showIntro));

  // Preload next image
  useEffect(() => {
    const next = directors[currentIndex + 1];
    if (next?.image_full_url) {
      const img = new Image();
      img.src = next.image_full_url;
    }
  }, [currentIndex, directors]);

  const startMatching = () => {
    if (window.lintrk) {
      window.lintrk('track', { conversion_id: 23694730 });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    setShowIntro(false);
  };

  const currentDirector = directors[currentIndex];

  const nextCard = () => {
    if (currentIndex < directors.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowContacts(true);
    }
  };

  const handleLike = () => {
    if (!currentDirector) return;
    setLikedContacts((prev) => [...prev, currentDirector]);
    track(currentDirector.id, 'like');
    nextCard();
  };

  const handlePass = () => {
    if (!currentDirector) return;
    if (currentDirector.type === 'profile') {
      track(currentDirector.id, 'pass');
    }
    nextCard();
  };

  const handleDetails = () => {
    if (currentDirector?.type === 'profile') {
      track(currentDirector.id, 'details');
    }
  };

  const handleVcard = () => {
    if (currentDirector?.type === 'profile') {
      track(currentDirector.id, 'vcard');
    }
  };

  const handlePubClick = (contact) => {
    track(contact.id, 'pub_click');
    window.open(contact.cta_url, '_blank');
  };

  const handleContactsVcard = (contact) => {
    track(contact.id, 'vcard');
  };

  const restart = () => {
    reshuffle();
    setCurrentIndex(0);
    setLikedContacts([]);
    setShowContacts(false);
    setShowIntro(false);
    setShowExplanation(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  if (loading) {
    return (
      <div className="app">
        <div style={{ color: 'white', padding: 40, textAlign: 'center' }}>Chargement…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div style={{ color: 'white', padding: 40, textAlign: 'center' }}>
          Erreur de chargement : {error}
        </div>
      </div>
    );
  }

  if (showIntro) {
    return <IntroScreen onStart={startMatching} />;
  }

  if (showContacts) {
    return (
      <div className="app contacts-mode">
        {showExplanation && <ExplanationOverlay onClose={() => setShowExplanation(false)} />}
        <Header
          likeCount={likedContacts.length}
          onLogoClick={restart}
          onCounterClick={() => {}}
        />
        <ContactList
          contacts={likedContacts}
          onPubClick={handlePubClick}
          onVcard={handleContactsVcard}
          onRestart={restart}
        />
      </div>
    );
  }

  if (!currentDirector) {
    return (
      <div className="app">
        <div style={{ color: 'white', padding: 40, textAlign: 'center' }}>Chargement…</div>
      </div>
    );
  }

  return (
    <div className="app swipe-mode">
      {showExplanation && <ExplanationOverlay onClose={() => setShowExplanation(false)} />}
      <Header
        likeCount={likedContacts.length}
        onCounterClick={() => setShowContacts(true)}
      />
      <ProgressBar total={directors.length} currentIndex={currentIndex} />
      <SwipeCard
        director={currentDirector}
        onLike={handleLike}
        onPass={handlePass}
        onDetails={handleDetails}
        onVcard={handleVcard}
      />
    </div>
  );
}
