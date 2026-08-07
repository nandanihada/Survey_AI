import type { AnimationConfig } from '../types/Survey';
import type { Variants } from 'framer-motion';

export const DEFAULT_ANIMATION: AnimationConfig = {
  questionAnimation: 'fadeSlideUp',
  answerAnimation: 'fadeIn',
  delayMs: 100,
  speedMs: 400,
  autoAdvance: false,
  autoAdvanceDelay: 1500,
};

export function getQuestionVariants(config?: AnimationConfig): Variants {
  const c = config || DEFAULT_ANIMATION;
  const dur = c.speedMs / 1000;
  const delay = c.delayMs / 1000;

  const map: Record<string, Variants> = {
    fadeSlideUp: {
      initial: { opacity: 0, y: 28 },
      animate: {
        opacity: 1, y: 0,
        transition: { duration: dur, delay, ease: [0.22, 1, 0.36, 1] },
      },
      exit: { opacity: 0, y: -20, transition: { duration: dur * 0.55, ease: 'easeIn' } },
    },
    typewriter: {
      initial: { opacity: 0, y: 10 },
      animate: {
        opacity: 1, y: 0,
        transition: { duration: dur * 0.6, delay, ease: 'easeOut' },
      },
      exit: { opacity: 0, transition: { duration: dur * 0.35 } },
    },
    flipIn: {
      initial: { opacity: 0, rotateX: 80 },
      animate: {
        opacity: 1, rotateX: 0,
        transition: { duration: dur, delay, ease: [0.16, 1, 0.3, 1] },
      },
      exit: { opacity: 0, rotateX: -40, transition: { duration: dur * 0.4, ease: 'easeIn' } },
    },
    zoomBounce: {
      initial: { opacity: 0, scale: 0.55 },
      animate: {
        opacity: 1, scale: 1,
        transition: { duration: dur, delay, type: 'spring', stiffness: 320, damping: 18, mass: 0.8 },
      },
      exit: { opacity: 0, scale: 0.85, transition: { duration: dur * 0.35 } },
    },
    slideFromLeft: {
      initial: { opacity: 0, x: -70 },
      animate: {
        opacity: 1, x: 0,
        transition: { duration: dur, delay, ease: [0.22, 1, 0.36, 1] },
      },
      exit: { opacity: 0, x: 50, transition: { duration: dur * 0.45, ease: 'easeIn' } },
    },
    blurReveal: {
      initial: { opacity: 0, filter: 'blur(14px)', scale: 0.97 },
      animate: {
        opacity: 1, filter: 'blur(0px)', scale: 1,
        transition: { duration: dur, delay, ease: 'easeOut' },
      },
      exit: { opacity: 0, filter: 'blur(8px)', transition: { duration: dur * 0.38 } },
    },
  };

  return map[c.questionAnimation] || map.fadeSlideUp;
}

/**
 * How long (seconds) the question animation takes to fully complete.
 * Answers must not start until this is done.
 */
export function getQuestionAnimationDuration(config?: AnimationConfig): number {
  const c = config || DEFAULT_ANIMATION;
  const dur = c.speedMs / 1000;
  const delay = c.delayMs / 1000;

  // typewriter: question fade-in is quick, but the CSS typewriter runs separately
  // We still wait for the fade-in to complete before answers start
  if (c.questionAnimation === 'typewriter') {
    // Estimate typewriter duration: roughly chars * 0.05s, min 1s, max 3s
    // Since we don't have char count here, use a generous fixed 2s
    return delay + 2.0;
  }
  // Spring animations settle a bit later than their duration
  if (c.questionAnimation === 'zoomBounce') return delay + dur + 0.15;
  return delay + dur;
}

export function getAnswerVariants(config?: AnimationConfig, index = 0): Variants {
  const c = config || DEFAULT_ANIMATION;
  const dur = c.speedMs / 1000;

  // Answers start AFTER the question finishes, then stagger one by one
  const questionDone = getQuestionAnimationDuration(c);
  // Small gap after question finishes before first answer appears
  const gapAfterQuestion = 0.08;
  // Per-answer stagger — each answer waits a bit longer than the previous
  const stagger = Math.max(0.08, dur * 0.18);

  const baseDelay = questionDone + gapAfterQuestion + index * stagger;

  const map: Record<string, Variants> = {
    fadeIn: {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: { duration: dur * 0.6, delay: baseDelay, ease: 'easeOut' },
      },
    },
    popScale: {
      initial: { opacity: 0, scale: 0.6 },
      animate: {
        opacity: 1, scale: 1,
        transition: { duration: dur * 0.5, delay: baseDelay, type: 'spring', stiffness: 400, damping: 22 },
      },
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: {
        opacity: 1, y: 0,
        transition: { duration: dur * 0.55, delay: baseDelay, ease: [0.22, 1, 0.36, 1] },
      },
    },
    staggerFade: {
      initial: { opacity: 0, x: -16 },
      animate: {
        opacity: 1, x: 0,
        transition: { duration: dur * 0.5, delay: baseDelay, ease: 'easeOut' },
      },
    },
    elastic: {
      initial: { opacity: 0, scale: 0.5, y: 14 },
      animate: {
        opacity: 1, scale: 1, y: 0,
        transition: { duration: dur, delay: baseDelay, type: 'spring', stiffness: 260, damping: 14, mass: 0.9 },
      },
    },
    glowReveal: {
      initial: { opacity: 0, filter: 'blur(6px)', scale: 0.95 },
      animate: {
        opacity: 1, filter: 'blur(0px)', scale: 1,
        transition: { duration: dur * 0.7, delay: baseDelay, ease: 'easeOut' },
      },
    },
  };

  return map[c.answerAnimation] || map.fadeIn;
}
