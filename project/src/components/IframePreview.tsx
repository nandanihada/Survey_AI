import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MemoryRouter } from 'react-router-dom';

interface IframePreviewProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const IframePreview: React.FC<IframePreviewProps> = ({ children, style, className }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    // Set up iframe document
    doc.open();
    doc.write('<!DOCTYPE html><html><head></head><body style="margin:0;padding:0;overflow:auto"><div id="preview-root"></div></body></html>');
    doc.close();

    // Function to sync all styles from parent to iframe
    const syncStyles = () => {
      if (!doc.head) return;
      // Remove old synced styles
      doc.head.querySelectorAll('[data-synced]').forEach(el => el.remove());

      // Copy all style and link elements
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.setAttribute('data-synced', 'true');
        doc.head.appendChild(clone);
      });
    };

    // Initial sync
    syncStyles();

    // Watch for new styles being added to parent head (Vite HMR, lazy loads)
    const observer = new MutationObserver(() => {
      syncStyles();
    });
    observer.observe(document.head, { childList: true, subtree: true });

    setMountNode(doc.getElementById('preview-root'));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <iframe
        ref={iframeRef}
        style={{ border: 'none', width: '100%', height: '100%', ...style }}
        className={className}
        title="Template Preview"
      />
      {mountNode &&
        createPortal(
          <MemoryRouter>
            {children}
          </MemoryRouter>,
          mountNode
        )}
    </>
  );
};

export default IframePreview;
