/**
 * Shared image rendering utilities for survey templates.
 * Keeps all image logic in one place so all templates stay in sync.
 *
 * Supports up to 4 question-level images arranged in a responsive grid.
 * Images are shown full-size (objectFit: contain) — no cropping.
 * Backward-compatible: old single questionImage field still works.
 */
import React from 'react';

export interface QuestionImageFields {
  /** Legacy single-image field — still supported */
  questionImage?: string;
  /** New multi-image field — up to 4 images */
  questionImages?: string[];
  questionImagePosition?: 'above' | 'below';
  optionImages?: Record<string, string>;
  optionImageMode?: 'with-text' | 'replace-text';
}

/**
 * Returns the unified image list for a question.
 * Merges legacy questionImage + new questionImages array, deduplicates, caps at 4.
 */
export function getQuestionImageList(q: QuestionImageFields): string[] {
  const imgs: string[] = [];
  if (q.questionImages && q.questionImages.length > 0) {
    imgs.push(...q.questionImages.filter(Boolean));
  } else if (q.questionImage) {
    imgs.push(q.questionImage);
  }
  // Deduplicate and cap at 4
  return [...new Set(imgs)].slice(0, 4);
}

/** Renders the question-level images (above or below the question text). */
export function QuestionImage({
  q,
  position,
}: {
  q: QuestionImageFields;
  position: 'above' | 'below';
}) {
  const pos = q.questionImagePosition ?? 'above';
  if (pos !== position) return null;

  const images = getQuestionImageList(q);
  if (images.length === 0) return null;

  // Layout:  1 image → full width  |  2 images → side by side  |  3-4 → 2×2 grid
  const gridStyle: React.CSSProperties =
    images.length === 1
      ? { display: 'block' }
      : { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 };

  return (
    <div
      className="survey-question-images"
      style={{
        ...gridStyle,
        marginBottom: position === 'above' ? 14 : 0,
        marginTop: position === 'below' ? 10 : 0,
      }}
    >
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          className="survey-question-image"
          style={{
            width: '100%',
            maxHeight: images.length === 1 ? 320 : 200,
            objectFit: 'contain',      // full picture — no cropping
            background: 'rgba(0,0,0,0.03)',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.08)',
            display: 'block',
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ))}
    </div>
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
