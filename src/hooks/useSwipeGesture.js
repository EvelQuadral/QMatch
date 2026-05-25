import { useRef, useState, useCallback } from 'react';

const SWIPE_THRESHOLD = 100;
const TAP_THRESHOLD = 6;
const EXIT_DURATION = 280;

export function useSwipeGesture({ onCommit, onTap, onProgress, disabled }) {
  const [drag, setDrag] = useState({ active: false, dx: 0, dy: 0, exiting: false, exitDir: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const pointerIdRef = useRef(null);

  const handlePointerDown = useCallback(
    (e) => {
      if (disabled || drag.exiting) return;
      pointerIdRef.current = e.pointerId;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      startPos.current = { x: e.clientX, y: e.clientY };
      movedRef.current = false;
      setDrag({ active: true, dx: 0, dy: 0, exiting: false, exitDir: 0 });
    },
    [disabled, drag.exiting]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (disabled || !drag.active || drag.exiting) return;
      if (e.pointerId !== pointerIdRef.current) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) {
        movedRef.current = true;
      }
      setDrag({ active: true, dx, dy, exiting: false, exitDir: 0 });
      onProgress?.(dx);
    },
    [disabled, drag.active, drag.exiting, onProgress]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (disabled || drag.exiting) return;
      if (e.pointerId !== pointerIdRef.current) return;
      pointerIdRef.current = null;

      const dx = drag.dx;
      const wasMoved = movedRef.current;

      if (!wasMoved) {
        // Tap : pas de swipe, on déclenche onTap si défini
        setDrag({ active: false, dx: 0, dy: 0, exiting: false, exitDir: 0 });
        onProgress?.(0);
        onTap?.();
        return;
      }

      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        // Swipe validé : on lance l'animation de sortie
        const dir = dx > 0 ? 1 : -1;
        setDrag({ active: false, dx, dy: 0, exiting: true, exitDir: dir });
        onProgress?.(0);
        setTimeout(() => {
          onCommit?.(dir > 0 ? 'like' : 'pass');
          setDrag({ active: false, dx: 0, dy: 0, exiting: false, exitDir: 0 });
        }, EXIT_DURATION);
      } else {
        // Retour à neutre
        setDrag({ active: false, dx: 0, dy: 0, exiting: false, exitDir: 0 });
        onProgress?.(0);
      }
    },
    [disabled, drag, onCommit, onTap, onProgress]
  );

  const handlePointerCancel = useCallback(
    (e) => {
      if (e.pointerId !== pointerIdRef.current) return;
      pointerIdRef.current = null;
      setDrag({ active: false, dx: 0, dy: 0, exiting: false, exitDir: 0 });
      onProgress?.(0);
    },
    [onProgress]
  );

  // Animation programmatique : "fly out" déclenchée par un clic bouton
  const flyOut = useCallback(
    (dir) => {
      if (drag.exiting) return;
      setDrag({ active: false, dx: dir * 200, dy: 0, exiting: true, exitDir: dir });
      setTimeout(() => {
        onCommit?.(dir > 0 ? 'like' : 'pass');
        setDrag({ active: false, dx: 0, dy: 0, exiting: false, exitDir: 0 });
      }, EXIT_DURATION);
    },
    [drag.exiting, onCommit]
  );

  const handlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  };

  // Calcul du transform
  let transform = '';
  let transition = 'none';
  if (drag.exiting) {
    const w = typeof window !== 'undefined' ? window.innerWidth : 400;
    transform = `translateX(${drag.exitDir * (w + 200)}px) rotate(${drag.exitDir * 18}deg)`;
    transition = `transform ${EXIT_DURATION}ms ease`;
  } else if (drag.active) {
    transform = `translateX(${drag.dx}px) rotate(${drag.dx / 18}deg)`;
    transition = 'none';
  } else {
    transform = '';
    transition = 'transform 250ms ease';
  }

  return {
    handlers,
    dragStyle: { transform, transition },
    drag,
    flyOut,
  };
}
