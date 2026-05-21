import { useEffect } from 'react';

export function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;

    const preventScroll = (e) => {
      const target = e.target;
      if (target.closest('.details-text') || target.closest('.details-content')) {
        return;
      }
      e.preventDefault();
    };

    const prev = {
      overflow: document.body.style.overflow,
      height: document.body.style.height,
      position: document.body.style.position,
      width: document.body.style.width,
    };

    document.body.classList.add('no-scroll');
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.body.classList.remove('no-scroll');
      document.body.style.overflow = prev.overflow;
      document.body.style.height = prev.height;
      document.body.style.position = prev.position;
      document.body.style.width = prev.width;
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [locked]);
}
