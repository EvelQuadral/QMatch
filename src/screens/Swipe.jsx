import React, { useState, useCallback, useRef } from 'react';
import Logo from '../components/Logo';
import CounterPill from '../components/CounterPill';
import ProgressBar from '../components/ProgressBar';
import SwipeCard from '../components/SwipeCard';
import ActionButtons from '../components/ActionButtons';
import BottomSheet from '../components/BottomSheet';
import { useScrollLock } from '../hooks/useScrollLock';
import './Swipe.css';

export default function Swipe({ deck, currentIndex, likedContacts, onLike, onPass, onTrack, onFinish }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const topCardRef = useRef(null);

  useScrollLock(true);

  const current = deck[currentIndex];

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
    setDragProgress(Math.max(-1, Math.min(1, dx / 100)));
  }, []);

  const handleDetails = useCallback(() => {
    if (current) onTrack?.(current.id, 'details');
  }, [current, onTrack]);

  const handleVcard = useCallback(() => {
    if (current) onTrack?.(current.id, 'vcard');
  }, [current, onTrack]);

  // Bouton ✕/❤ : appel direct sur le ref de la top card → 1 seul fly-out par click
  const handleButtonPass = () => {
    if (topCardRef.current?.flyOut) topCardRef.current.flyOut(-1);
  };
  const handleButtonLike = () => {
    if (topCardRef.current?.flyOut) topCardRef.current.flyOut(1);
  };

  if (!current) {
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
          {visibleCards
            .slice()
            .reverse()
            .map(({ item, depth }) => (
              <SwipeCard
                key={item.id}
                ref={depth === 0 ? topCardRef : null}
                director={item}
                depth={depth}
                isTop={depth === 0}
                cardNumber={depth === 0 ? currentIndex + 1 : null}
                totalCards={depth === 0 ? deck.length : null}
                onCommit={depth === 0 ? commit : undefined}
                onProgress={depth === 0 ? handleProgress : undefined}
                onDetails={depth === 0 ? handleDetails : undefined}
                onVcard={depth === 0 ? handleVcard : undefined}
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
