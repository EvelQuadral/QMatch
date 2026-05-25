import React, { useEffect, useRef } from 'react';
import { Heart, ChevronRight } from 'lucide-react';
import './CounterPill.css';

export default function CounterPill({ count, onClick }) {
  const ref = useRef(null);
  const prev = useRef(count);

  // Bump à chaque nouveau like (réaction immédiate)
  useEffect(() => {
    if (prev.current !== count && prev.current !== undefined && ref.current) {
      ref.current.classList.remove('counter-bump');
      void ref.current.offsetWidth; // reflow
      ref.current.classList.add('counter-bump');
    }
    prev.current = count;
  }, [count]);

  const empty = count === 0;

  let label;
  if (empty) label = 'Aucun like';
  else if (count === 1) label = 'Voir mon like';
  else label = `Voir mes ${count} likes`;

  return (
    <button
      ref={ref}
      type="button"
      className={`counter ${empty ? 'counter-empty' : 'counter-active'}`}
      onClick={empty ? undefined : onClick}
      disabled={empty}
      aria-label={empty ? 'Aucun like pour l’instant' : `Voir ${count} like${count > 1 ? 's' : ''}`}
    >
      <Heart size={14} fill={empty ? 'none' : 'currentColor'} strokeWidth={empty ? 1.5 : 2} />
      <span className="counter-label">{label}</span>
      {!empty && <ChevronRight size={14} className="counter-chevron" />}
    </button>
  );
}
