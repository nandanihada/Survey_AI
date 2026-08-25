/**
 * SurveyVideoPlayer
 *
 * Renders a list of video buttons on the survey page. Each button opens a
 * full-screen overlay with a native <video> player. When the overlay is open:
 *
 * - Tab-visibility guard: if the respondent switches tabs or minimises the
 *   browser window, the survey is immediately disqualified (onDisqualify fires).
 * - Replay: controlled by the `replayEnabled` prop. When false (default), the
 *   play button is greyed out after the video has been fully watched once.
 *
 * Usage in BasicSurveyTemplate:
 *   <SurveyVideoPlayer
 *     videos={survey.survey_videos}
 *     replayEnabled={survey.video_replay_enabled}
 *     onDisqualify={() => { ... }}
 *   />
 */

import React, { useEffect, useRef, useState } from 'react';
import type { SurveyVideo } from '../types/Survey';

interface Props {
  videos: SurveyVideo[];
  replayEnabled?: boolean;
  /** Called when the respondent switches tabs while a video is open. */
  onDisqualify: () => void;
}

const SurveyVideoPlayer: React.FC<Props> = ({
  videos,
  replayEnabled = false,
  onDisqualify,
}) => {
  // Index of the currently-open video, or null when overlay is closed
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  // Set of video indexes that have been fully watched at least once
  const [watched, setWatched] = useState<Set<number>>(new Set());
  // Whether the currently-open video has ended (so we can mark it watched)
  const [videoEnded, setVideoEnded] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // ── Tab-visibility guard ───────────────────────────────────────────────────
  useEffect(() => {
    if (openIdx === null) return; // guard only active when overlay is open

    const handleVisibility = () => {
      if (document.hidden) {
        // User switched away — disqualify immediately
        closeOverlay();
        onDisqualify();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [openIdx, onDisqualify]);

  // ── Keyboard close (Escape) ────────────────────────────────────────────────
  useEffect(() => {
    if (openIdx === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeOverlay();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [openIdx]);

  // ── Lock body scroll when overlay is open ─────────────────────────────────
  useEffect(() => {
    if (openIdx !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [openIdx]);

  const openOverlay = (idx: number) => {
    setVideoEnded(false);
    setOpenIdx(idx);
  };

  const closeOverlay = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setOpenIdx(null);
  };

  const handleVideoEnded = () => {
    setVideoEnded(true);
    if (openIdx !== null) {
      setWatched(prev => new Set(prev).add(openIdx));
    }
  };

  if (!videos || videos.length === 0) return null;

  // ── Determine if a video button should be disabled ─────────────────────────
  const isDisabled = (idx: number) =>
    !replayEnabled && watched.has(idx);

  return (
    <>
      {/* ── Warning banner ───────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #1a2d4a 100%)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          boxShadow: '0 2px 12px rgba(30,58,95,0.18)',
        }}
      >
        {/* Warning icon */}
        <div style={{
          flexShrink: 0, marginTop: 1,
          width: 20, height: 20,
          borderRadius: '50%',
          background: 'rgba(251,191,36,0.18)',
          border: '1.5px solid rgba(251,191,36,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#fbbf24',
        }}>!</div>

        <p style={{
          fontSize: 13, color: '#e2e8f0', lineHeight: 1.55,
          fontWeight: 500, margin: 0,
        }}>
          Kindly watch carefully.{' '}
          <strong style={{ color: '#fbbf24', fontWeight: 700 }}>
            Do not switch to a different tab or minimise this window.
          </strong>
          {' '}Doing so will disqualify your survey response.
        </p>
      </div>

      {/* ── Video buttons ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: videos.length === 1 ? 'column' : 'row',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 24,
        }}
      >
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
                border: done
                  ? '1.5px solid rgba(16,185,129,0.5)'
                  : '1.5px solid rgba(99,102,241,0.35)',
                background: disabled
                  ? 'rgba(30,30,40,0.04)'
                  : done
                    ? 'rgba(16,185,129,0.08)'
                    : 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: disabled ? 0.55 : 1,
                boxShadow: disabled ? 'none' : '0 2px 8px rgba(99,102,241,0.1)',
              }}
            >
              {/* Play / Watched icon */}
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: done
                  ? 'rgba(16,185,129,0.15)'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: done ? 'none' : '0 3px 10px rgba(99,102,241,0.3)',
              }}>
                {done ? (
                  // checkmark
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  // play triangle
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
              </div>

              <div style={{ textAlign: 'left', flex: 1 }}>
                <p style={{
                  fontSize: 13, fontWeight: 700, margin: 0,
                  color: done ? '#10b981' : '#1e293b',
                  lineHeight: 1.3,
                }}>
                  {v.title || `Video ${idx + 1}`}
                </p>
                <p style={{
                  fontSize: 11, fontWeight: 500, margin: '2px 0 0',
                  color: done ? '#6ee7b7' : '#6366f1',
                  opacity: done ? 1 : 0.85,
                }}>
                  {done ? (replayEnabled ? 'Watched — click to replay' : 'Watched') : 'Click to watch'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Full-screen overlay ───────────────────────────────────────────── */}
      {openIdx !== null && (
        <div
          ref={overlayRef}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            padding: '20px',
          }}
        >
          {/* Close button — rendered INSIDE the overlay flex container, self-aligned top-right */}
          <div style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
          }}>
            <button
              type="button"
              onClick={closeOverlay}
              aria-label="Close video"
              style={{
                width: 48, height: 48,
                borderRadius: '50%',
                border: '2.5px solid #fff',
                background: '#e53e3e',
                color: '#fff',
                fontSize: 26,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                boxShadow: '0 0 0 4px rgba(229,62,62,0.35), 0 4px 16px rgba(0,0,0,0.5)',
                padding: 0,
              }}
            >
              ×
            </button>
          </div>

          {/* Title */}
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
            letterSpacing: 0.3,
            textAlign: 'center',
          }}>
            {videos[openIdx]?.title || `Video ${openIdx + 1}`}
          </p>

          {/* Video element */}
          <video
            ref={videoRef}
            src={videos[openIdx]?.url}
            controls
            autoPlay
            onEnded={handleVideoEnded}
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 140px)',
              borderRadius: 12,
              outline: 'none',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
          />

          {/* Ended nudge */}
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
        </div>
      )}
    </>
  );
};

export default SurveyVideoPlayer;
