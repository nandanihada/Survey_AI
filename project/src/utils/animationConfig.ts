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
      initial: { opacity: 0, y: 24 },
      animate: { opacity: 1, y: 0, transition: { duration: dur, delay } },
      exit: { opacity: 0, y: -16, transition: { duration: dur * 0.6 } },
    },
    typewriter: {
      initial: { opacity: 0, width: 0 },
      animate: { opacity: 1, width: '100%', transition: { duration: dur * 1.5, delay, ease: 'easeOut' } },
      exit: { opacity: 0, transition: { duration: dur * 0.4 } },
    },
    flipIn: {
      initial: { opacity: 0, rotateX: 90 },
      animate: { opacity: 1, rotateX: 0, transition: { duration: dur, delay, ease: 'easeOut' } },
      exit: { opacity: 0, rotateX: -45, transition: { duration: dur * 0.5 } },
    },
    zoomBounce: {
      initial: { opacity: 0, scale: 0.5 },
      animate: { opacity: 1, scale: 1, transition: { duration: dur, delay, type: 'spring', stiffness: 300, damping: 15 } },
      exit: { opacity: 0, scale: 0.8, transition: { duration: dur * 0.4 } },
    },
    slideFromLeft: {
      initial: { opacity: 0, x: -60 },
      animate: { opacity: 1, x: 0, transition: { duration: dur, delay, ease: 'easeOut' } },
      exit: { opacity: 0, x: 40, transition: { duration: dur * 0.5 } },
    },
    blurReveal: {
      initial: { opacity: 0, filter: 'blur(12px)' },
      animate: { opacity: 1, filter: 'blur(0px)', transition: { duration: dur, delay } },
      exit: { opacity: 0, filter: 'blur(8px)', transition: { duration: dur * 0.4 } },
    },
  };

  return map[c.questionAnimation] || map.fadeSlideUp;
}

export function getAnswerVariants(config?: AnimationConfig, index = 0): Variants {
  const c = config || DEFAULT_ANIMATION;
  const dur = c.speedMs / 1000;
  const baseDelay = (c.delayMs / 1000) + (dur * 0.3);

  const map: Record<string, Variants> = {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: dur * 0.8, delay: baseDelay + index * 0.04 } },
    },
    popScale: {
      initial: { opacity: 0, scale: 0.7 },
      animate: { opacity: 1, scale: 1, transition: { duration: dur * 0.6, delay: baseDelay + index * 0.05, type: 'spring', stiffness: 400, damping: 18 } },
    },
    slideUp: {
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0, transition: { duration: dur * 0.7, delay: baseDelay + index * 0.05 } },
    },
    staggerFade: {
      initial: { opacity: 0, x: -12 },
      animate: { opacity: 1, x: 0, transition: { duration: dur * 0.5, delay: baseDelay + index * 0.1 } },
    },
    elastic: {
      initial: { opacity: 0, scale: 0.6, y: 10 },
      animate: { opacity: 1, scale: 1, y: 0, transition: { duration: dur, delay: baseDelay + index * 0.06, type: 'spring', stiffness: 250, damping: 12 } },
    },
    glowReveal: {
      initial: { opacity: 0, boxShadow: '0 0 0px rgba(255,255,255,0)' },
      animate: { opacity: 1, boxShadow: '0 0 12px rgba(255,255,255,0)', transition: { duration: dur * 0.8, delay: baseDelay + index * 0.06 } },
    },
  };

  return map[c.answerAnimation] || map.fadeIn;
}
