import React, { useEffect, useRef } from 'react';
import { Heart, ChevronRight } from 'lucide-react';
import './CounterPill.css';

export default function CounterPill({ count, onClick }) {
  const ref = useRef(null);
  const prevCount = useRef(count);

  // Pulse one-shot quand on franchit le seuil 3
  useEffect(() => {
    if (prevCount.current < 3 && count >= 3 && ref.current) {
      ref.current.classList.remove('counter-pulse');
      // reflow forcé pour replay animation
      void ref.current.offsetWidth;
      ref.current.classList.add('counter-pulse');
    }
    prevCount.current = count;
  }, [count]);

  const empty = count === 0;
  const compact = count > 0 && count < 3;
  const expanded = count >= 3;

  return (
    <button
      ref={ref}
      type="button"
      className={`counter ${empty ? 'counter-empty' : 'counter-active'} ${expanded ? 'counter-expanded' : ''}`}
      onClick={empty ? undefined : onClick}
      disabled={empty}
      aria-label={count === 0 ? 'Aucun match' : `${count} match${count > 1 ? 's' : ''}`}
    >
      <Heart size={14} fill={empty ? 'none' : 'currentColor'} strokeWidth={empty ? 1.5 : 2} />
      <span className="counter-num">{count}</span>
      {expanded && (
        <>
          <span className="counter-label">match{count > 1 ? 's' : ''}</span>
          <ChevronRight size={14} />
        </>
      )}
    </button>
  );
}
