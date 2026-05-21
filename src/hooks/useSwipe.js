import { useState, useRef, useCallback } from 'react';

const THRESHOLD = 100;

export function useSwipe({ onLike, onPass, disabled }) {
  const [drag, setDrag] = useState({ active: false, dx: 0, dy: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const handleStart = useCallback(
    (e) => {
      if (disabled) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startPos.current = { x: clientX, y: clientY };
      setDrag({ active: true, dx: 0, dy: 0 });
    },
    [disabled]
  );

  const handleMove = useCallback(
    (e) => {
      if (disabled || !drag.active) return;
      if (e.cancelable) e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setDrag({
        active: true,
        dx: clientX - startPos.current.x,
        dy: clientY - startPos.current.y,
      });
    },
    [disabled, drag.active]
  );

  const handleEnd = useCallback(() => {
    if (disabled) return;
    const { dx } = drag;
    if (Math.abs(dx) > THRESHOLD) {
      if (dx > 0) onLike?.();
      else onPass?.();
    }
    setDrag({ active: false, dx: 0, dy: 0 });
  }, [disabled, drag, onLike, onPass]);

  const handlers = {
    onMouseDown: handleStart,
    onMouseMove: handleMove,
    onMouseUp: handleEnd,
    onMouseLeave: handleEnd,
    onTouchStart: handleStart,
    onTouchMove: handleMove,
    onTouchEnd: handleEnd,
  };

  const cardStyle = {
    transform: drag.active || drag.dx !== 0
      ? `translateX(${drag.dx}px) translateY(${drag.dy * 0.1}px) rotate(${drag.dx * 0.1}deg)`
      : 'none',
    transition: drag.active ? 'none' : 'transform 0.3s ease-out',
  };

  const likeOpacity = Math.max(0, Math.min(1, drag.dx / 150));
  const passOpacity = Math.max(0, Math.min(1, -drag.dx / 150));

  return { handlers, cardStyle, likeOpacity, passOpacity };
}
