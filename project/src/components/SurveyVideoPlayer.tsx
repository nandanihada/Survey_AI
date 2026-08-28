/**
 * SurveyVideoPlayer
 *
 * Renders video buttons inline. When a button is clicked, the fullscreen
 * overlay is rendered via ReactDOM.createPortal directly into document.body —
 * this guarantees it sits above EVERYTHING on the page including login modals,
 * cookie banners, and any other z-index stacking contexts.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SurveyVideo } from '../types/Survey';

interface Props {
  videos: SurveyVideo[];
  replayEnabled?: boolean;
  onDisqualify: () => void;
}

const SurveyVideoPlayer: React.FC<Props> = ({
  videos,
  replayEnabled = false,
  onDisqualify,
}) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [watched, setWatched] = useState<Set<number>>(new Set());
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ── Tab-visibility guard ───────────────────────────────────────────────────
  useEffect(() => {
    if (openIdx === null) return;
    const handleVisibility = () => {
      if (document.hidden) {
        closeOverlay();
        onDisqualify();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [openIdx, onDisqualify]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (openIdx === null) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeOverlay(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [openIdx]);

  // ── Body scroll lock ──────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = openIdx !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [openIdx]);

  const openOverlay = (idx: number) => { setVideoEnded(false); setOpenIdx(idx); };
  const closeOverlay = () => { videoRef.current?.pause(); setOpenIdx(null); };
  const handleVideoEnded = () => {
    setVideoEnded(true);
    if (openIdx !== null) setWatched(prev => new Set(prev).add(openIdx));
  };

  if (!videos || videos.length === 0) return null;

  const isDisabled = (idx: number) => !replayEnabled && watched.has(idx);

  // ── Portal overlay — rendered into document.body ──────────────────────────
  const overlay = openIdx !== null ? createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        // Use the maximum possible z-index so nothing can appear above this
        zIndex: 2147483647,
        background: 'rgba(0,0,0,0.96)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '70px 20px 20px',
      }}
    >
      {/* ── Close button — positioned relative to the portal root ── */}
      <button
        type="button"
        onClick={closeOverlay}
        aria-label="Close video"
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '3px solid #ffffff',
          background: '#e53e3e',
          color: '#ffffff',
          fontSize: 28,
          fontWeight: 900,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          padding: 0,
          // This button is inside the portal so its z-index stacks relative
          // to the portal div which is already at max z-index
          zIndex: 1,
          boxShadow: '0 0 0 5px rgba(229,62,62,0.35), 0 6px 24px rgba(0,0,0,0.7)',
          userSelect: 'none',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        ✕
      </button>

      {/* Title */}
      {videos[openIdx] && (
        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 16,
          letterSpacing: 0.3,
          textAlign: 'center',
        }}>
          {videos[openIdx].title || `Video ${openIdx + 1}`}
        </p>
      )}

      {/* Video */}
      {videos[openIdx] && (
        <video
          ref={videoRef}
          src={videos[openIdx].url}
          controls
          autoPlay
          onEnded={handleVideoEnded}
          style={{
            maxWidth: '100%',
            maxHeight: 'calc(100vh - 160px)',
            borderRadius: 12,
            outline: 'none',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          }}
        />
      )}

      {/* Ended message */}
      {videoEnded && (
        <p style={{
          color: '#6ee7b7',
          fontSize: 13,
          fontWeight: 600,
          marginTop: 16,
          textAlign: 'center',
        }}>
          ✓ Done — you can close this video now.
        </p>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <>
      {/* Portal overlay (rendered into document.body) */}
      {overlay}

      {/* ── Warning banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #1a2d4a 100%)',
        borderRadius: 12,
        padding: '14px 18px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        boxShadow: '0 2px 12px rgba(30,58,95,0.18)',
      }}>
        <div style={{
          flexShrink: 0, marginTop: 1,
          width: 20, height: 20,
          borderRadius: '50%',
          background: 'rgba(251,191,36,0.18)',
          border: '1.5px solid rgba(251,191,36,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#fbbf24',
        }}>!</div>
        <p style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.55, fontWeight: 500, margin: 0 }}>
          Kindly watch carefully.{' '}
          <strong style={{ color: '#fbbf24', fontWeight: 700 }}>
            Do not switch to a different tab or minimise this window.
          </strong>
          {' '}Doing so will disqualify your survey response.
        </p>
      </div>

      {/* ── Video buttons ── */}
      <div style={{
        display: 'flex',
        flexDirection: videos.length === 1 ? 'column' : 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
      }}>
        {videos.map((v, idx) => {
          const done = watched.has(idx);
          const disabled = isDisabled(idx);
          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => openOverlay(idx)}
              style={{
                flex: videos.length > 1 ? '1 1 calc(50% - 5px)' : '1 1 100%',
                minWidth: 160,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '13px 18px',
                borderRadius: 10,
                border: done ? '1.5px solid rgba(16,185,129,0.5)' : '1.5px solid rgba(99,102,241,0.35)',
                background: disabled
                  ? 'rgba(30,30,40,0.04)'
                  : done ? 'rgba(16,185,129,0.08)' : 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: disabled ? 0.55 : 1,
                boxShadow: disabled ? 'none' : '0 2px 8px rgba(99,102,241,0.1)',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: done ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: done ? 'none' : '0 3px 10px rgba(99,102,241,0.3)',
              }}>
                {done ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: done ? '#10b981' : '#1e293b', lineHeight: 1.3 }}>
                  {v.title || `Video ${idx + 1}`}
                </p>
                <p style={{ fontSize: 11, fontWeight: 500, margin: '2px 0 0', color: done ? '#6ee7b7' : '#6366f1', opacity: done ? 1 : 0.85 }}>
                  {done ? (replayEnabled ? 'Watched — click to replay' : 'Watched') : 'Click to watch'}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default SurveyVideoPlayer;
