import React, { useState, useCallback } from 'react';
import Logo from '../components/Logo';
import CounterPill from '../components/CounterPill';
import ProgressBar from '../components/ProgressBar';
import SwipeCard from '../components/SwipeCard';
import ActionButtons from '../components/ActionButtons';
import BottomSheet from '../components/BottomSheet';
import './Swipe.css';

export default function Swipe({ deck, currentIndex, likedContacts, onLike, onPass, onTrack, onFinish }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [pendingFlyDir, setPendingFlyDir] = useState(null);

  const current = deck[currentIndex];

  // Les 3 cartes visibles
  const visibleCards = [
    { item: deck[currentIndex], depth: 0 },
    { item: deck[currentIndex + 1], depth: 1 },
    { item: deck[currentIndex + 2], depth: 2 },
  ].filter((c) => c.item);

  const commit = useCallback(
    (action) => {
      if (action === 'like') onLike?.(current);
      else onPass?.(current);
    },
    [current, onLike, onPass]
  );

  const handleProgress = useCallback((dx) => {
    const normalized = Math.max(-1, Math.min(1, dx / 100));
    setDragProgress(normalized);
  }, []);

  const handleDetails = useCallback(() => {
    if (current) onTrack?.(current.id, 'details');
  }, [current, onTrack]);

  const handleVcard = useCallback(() => {
    if (current) onTrack?.(current.id, 'vcard');
  }, [current, onTrack]);

  // Bouton ✕/❤ : utilise une flyOut programmatique
  const handleButtonPass = () => setPendingFlyDir({ dir: -1, ts: Date.now() });
  const handleButtonLike = () => setPendingFlyDir({ dir: 1, ts: Date.now() });

  if (!current) {
    // Plus de cartes — on appelle onFinish
    onFinish?.();
    return null;
  }

  return (
    <div className="swipe">
      <header className="swipe-header">
        <Logo />
        <CounterPill count={likedContacts.length} onClick={() => setSheetOpen(true)} />
      </header>

      <div className="swipe-progress-wrap">
        <ProgressBar total={deck.length} currentIndex={currentIndex} />
      </div>

      <div className="swipe-stage">
        <div className="card-stage-inner">
          {/* On rend les cartes en ordre inverse (plus profonde en premier dans le DOM) */}
          {visibleCards
            .slice()
            .reverse()
            .map(({ item, depth }) => (
              <SwipeCard
                key={item.id}
                director={item}
                depth={depth}
                isTop={depth === 0}
                cardNumber={depth === 0 ? currentIndex + 1 : null}
                totalCards={depth === 0 ? deck.length : null}
                onCommit={depth === 0 ? commit : undefined}
                onProgress={depth === 0 ? handleProgress : undefined}
                onDetails={depth === 0 ? handleDetails : undefined}
                onVcard={depth === 0 ? handleVcard : undefined}
                flyDir={depth === 0 ? pendingFlyDir : null}
              />
            ))}
        </div>
      </div>

      <ActionButtons
        onPass={handleButtonPass}
        onLike={handleButtonLike}
        dragProgress={dragProgress}
      />

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        matches={likedContacts}
        currentIndex={currentIndex}
        totalCards={deck.length}
        onContinue={() => setSheetOpen(false)}
        onFinish={() => {
          setSheetOpen(false);
          onFinish?.();
        }}
        onAction={(contact) => onTrack?.(contact.id, contact.type === 'pub' ? 'pub_click' : 'vcard')}
      />
    </div>
  );
}
