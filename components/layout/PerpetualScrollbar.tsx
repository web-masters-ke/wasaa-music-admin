'use client';
import { useEffect, useRef, useState, RefObject, useCallback } from 'react';

/**
 * Perpetual brick-orange scrollbar for the sidebar.
 * Spec-locked: brick #0081FF, always-visible track, drag/click, thumb grips.
 *
 * The nav element must already have the `.sidebar-scroll-hidden` class so the
 * native scrollbar is not visible. This component overlays its own scrollbar.
 */
export default function PerpetualScrollbar({
  scrollRef,
  pathname,
}: {
  scrollRef: RefObject<HTMLElement>;
  pathname?: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef  = useRef<{ startY: number; startScrollTop: number } | null>(null);
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(48);
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);

  const recompute = useCallback(() => {
    const nav = scrollRef.current;
    if (!nav) return;
    const visibleH = nav.clientHeight;
    const totalH   = nav.scrollHeight;
    // Layout may briefly report clientHeight=0 during mount — keep track
    // rendered but skip the math to avoid flicker.
    if (visibleH <= 0) return;
    if (totalH <= visibleH + 1) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const track = trackRef.current;
    // Compute thumb math using the nav dimensions even if track hasn't
    // measured yet — trackH ≈ visibleH.
    const trackH = track?.clientHeight || visibleH;
    const nextThumbH = Math.max(48, (visibleH * visibleH) / totalH);
    const denom = totalH - visibleH;
    const nextThumbTop = denom > 0 ? (nav.scrollTop / denom) * (trackH - nextThumbH) : 0;
    setThumbHeight(nextThumbH);
    setThumbTop(nextThumbTop);
  }, [scrollRef]);

  useEffect(() => {
    const nav = scrollRef.current;
    if (!nav) return;

    const onScroll = () => {
      recompute();
      try { sessionStorage.setItem('sidebar-scroll', String(nav.scrollTop)); } catch { /* noop */ }
    };
    nav.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => recompute());
    ro.observe(nav);
    Array.from(nav.children).forEach((c) => ro.observe(c as Element));

    // restore
    try {
      const saved = sessionStorage.getItem('sidebar-scroll');
      if (saved) nav.scrollTop = Number(saved) || 0;
    } catch { /* noop */ }

    // Recompute at several intervals to survive initial-layout race + font
    // loads + delayed child renders.
    recompute();
    const timers = [50, 150, 350, 800, 1500].map(t => setTimeout(recompute, t));
    return () => {
      nav.removeEventListener('scroll', onScroll);
      ro.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [recompute, scrollRef]);

  // Recompute on route change (nav content may collapse/expand groups)
  useEffect(() => {
    const id = setTimeout(recompute, 50);
    return () => clearTimeout(id);
  }, [pathname, recompute]);

  const onThumbDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const nav = scrollRef.current;
    if (!nav) return;
    dragRef.current = { startY: e.clientY, startScrollTop: nav.scrollTop };
    setDragging(true);

    const onMove = (ev: MouseEvent) => {
      const start = dragRef.current;
      const trk = trackRef.current;
      const n = scrollRef.current;
      if (!start || !trk || !n) return;
      const visibleH = n.clientHeight;
      const totalH   = n.scrollHeight;
      const trackH = trk.clientHeight;
      const denom = trackH - thumbHeight;
      if (denom <= 0) return;
      const delta = ev.clientY - start.startY;
      n.scrollTop = start.startScrollTop + (delta / denom) * (totalH - visibleH);
    };
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const onTrackClick = (e: React.MouseEvent) => {
    // ignore clicks on the thumb itself
    if ((e.target as HTMLElement).dataset.role === 'thumb') return;
    const nav = scrollRef.current;
    const track = trackRef.current;
    if (!nav || !track) return;
    const rect = track.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const trackH = rect.height;
    const visibleH = nav.clientHeight;
    const totalH = nav.scrollHeight;
    if (totalH <= visibleH) return;
    nav.scrollTop = ((y - thumbHeight / 2) / (trackH - thumbHeight)) * (totalH - visibleH);
  };

  if (!visible) return null;

  return (
    <div
      ref={trackRef}
      onClick={onTrackClick}
      className="absolute top-0 right-0 bottom-0 z-30 select-none"
      style={{
        width: 12,
        background: 'rgba(0, 129, 255, 0.18)',
        borderLeft: '1px solid rgba(0, 129, 255, 0.35)',
      }}
      aria-hidden="true"
    >
      <div
        data-role="thumb"
        onMouseDown={onThumbDown}
        style={{
          position: 'absolute',
          left: 1,
          right: 1,
          top: thumbTop,
          height: thumbHeight,
          background: '#0081FF',
          borderRadius: 6,
          cursor: dragging ? 'grabbing' : 'grab',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 10px -4px rgba(0,129,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: dragging ? 'none' : 'top 60ms linear',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }} data-role="thumb">
          <span data-role="thumb" style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.45)' }} />
          <span data-role="thumb" style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.45)' }} />
          <span data-role="thumb" style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(255,255,255,0.45)' }} />
        </div>
      </div>
    </div>
  );
}
