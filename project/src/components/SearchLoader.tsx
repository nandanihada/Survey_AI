import React from 'react';

interface GooeyLoaderProps {
  message?: string;
  primaryColor?: string;
  secondaryColor?: string;
  borderColor?: string;
}

/**
 * Full-page gooey loading animation with red accent.
 * Covers the entire screen with a backdrop + centered loader.
 */
const SearchLoader: React.FC<GooeyLoaderProps> = ({
  message,
  primaryColor = '#ef4444',
  secondaryColor = '#fca5a5',
  borderColor = '#e5e7eb',
}) => {
  const style = {
    '--gooey-primary-color': primaryColor,
    '--gooey-secondary-color': secondaryColor,
    '--gooey-border-color': borderColor,
  } as React.CSSProperties;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white" style={{ animation: 'loaderFadeIn 0.3s ease-out' }}>
      {/* Loader */}
      <div
        className="relative flex items-center justify-center"
        style={style}
        role="status"
        aria-label="Loading"
      >
        {/* SVG filter for gooey effect */}
        <svg className="absolute w-0 h-0">
          <defs>
            <filter id="gooey-loader-filter">
              <feGaussianBlur in="SourceGraphic" stdDeviation={12} result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 48 -7"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>

        <style>{`
          .gooey-loader {
            width: 12em;
            height: 3em;
            position: relative;
            overflow: hidden;
            border-bottom: 8px solid var(--gooey-border-color);
            filter: url(#gooey-loader-filter);
          }
          .gooey-loader::before,
          .gooey-loader::after {
            content: '';
            position: absolute;
            border-radius: 50%;
          }
          .gooey-loader::before {
            width: 22em;
            height: 18em;
            background-color: var(--gooey-primary-color);
            left: -2em;
            bottom: -18em;
            animation: gooey-loader-wee1 2s linear infinite;
          }
          .gooey-loader::after {
            width: 16em;
            height: 12em;
            background-color: var(--gooey-secondary-color);
            left: -4em;
            bottom: -12em;
            animation: gooey-loader-wee2 2s linear infinite 0.75s;
          }
          @keyframes gooey-loader-wee1 {
            0% { transform: translateX(-10em) rotate(0deg); }
            100% { transform: translateX(7em) rotate(180deg); }
          }
          @keyframes gooey-loader-wee2 {
            0% { transform: translateX(-8em) rotate(0deg); }
            100% { transform: translateX(8em) rotate(180deg); }
          }
          @keyframes loaderFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        <div className="gooey-loader" />
      </div>
    </div>
  );
};

export default SearchLoader;
