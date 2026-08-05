/**
 * Shared image rendering utilities for survey templates.
 * Keeps all image logic in one place so all templates stay in sync.
 */
import React from 'react';

export interface QuestionImageFields {
  questionImage?: string;
  questionImagePosition?: 'above' | 'below';
  optionImages?: Record<string, string>;
  optionImageMode?: 'with-text' | 'replace-text';
}

/** Renders the question-level image (above or below the question text). */
export function QuestionImage({
  q,
  position,
}: {
  q: QuestionImageFields;
  position: 'above' | 'below';
}) {
  if (!q.questionImage) return null;
  const pos = q.questionImagePosition ?? 'above';
  if (pos !== position) return null;
  return (
    <img
      src={q.questionImage}
      alt=""
      className="survey-question-image"
      style={{
        width: '100%',
        maxHeight: 260,
        objectFit: 'cover',
        borderRadius: 10,
        marginBottom: position === 'above' ? 14 : 0,
        marginTop: position === 'below' ? 10 : 0,
        border: '1px solid rgba(0,0,0,0.1)',
        display: 'block',
      }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

/** Renders an option's image (or null if none). */
export function OptionImage({
  src,
  alt,
  mode,
}: {
  src?: string;
  alt: string;
  mode: 'with-text' | 'replace-text';
}) {
  if (!src) return null;
  if (mode === 'replace-text') {
    return (
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          maxHeight: 110,
          objectFit: 'contain',
          borderRadius: 8,
          display: 'block',
        }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  // with-text: small inline thumbnail
  return (
    <img
      src={src}
      alt=""
      style={{
        width: 42,
        height: 42,
        objectFit: 'cover',
        borderRadius: 6,
        flexShrink: 0,
        border: '1px solid rgba(0,0,0,0.1)',
        display: 'block',
      }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

/**
 * Wraps an option label with an optional inline image.
 * Returns the label node, possibly decorated with a thumbnail.
 */
export function wrapOptionLabel(
  labelNode: React.ReactNode,
  optText: string,
  q: QuestionImageFields
): React.ReactNode {
  const img = q.optionImages?.[optText];
  const mode = q.optionImageMode ?? 'with-text';
  if (!img) return labelNode;
  if (mode === 'replace-text') {
    return (
      <OptionImage src={img} alt={optText} mode="replace-text" />
    );
  }
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <OptionImage src={img} alt="" mode="with-text" />
      {labelNode}
    </span>
  );
}
