'use client';

import * as React from 'react';

interface FullscreenBlockOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

/**
 * FullscreenBlockOverlay — a plain fixed-position overlay for Excalidraw fullscreen.
 *
 * ─── WHY NOT RADIX DIALOG? ────────────────────────────────────────────────────
 *
 * Radix Dialog applies `aria-modal="true"` and a focus-trap to its content, and
 * in newer versions sets `inert` on all sibling DOM nodes. Excalidraw renders
 * its own modals (Mermaid-to-diagram panel, Library panel, Help dialog) as React
 * portals appended to `<body>` — OUTSIDE the Radix content node. Those portals
 * end up marked `inert` and become non-interactive (clicks pass through, inputs
 * ignore focus).
 *
 * Using a plain div avoids all of that. We replicate the essential behaviors:
 *   - Body scroll lock (prevents the page from jumping while drawing).
 *   - Escape key handler (via keydown listener on the document).
 *   - ARIA semantics (role="dialog", aria-modal, aria-label).
 *
 * ─── CLOSE BUTTON ─────────────────────────────────────────────────────────────
 * This component intentionally does NOT render a close button.
 * DiagramBlock injects its own minimize/maximize toggle via Excalidraw's
 * `renderTopRightUI` API so the button lives inside the native toolbar.
 */
export const FullscreenBlockOverlay = React.forwardRef<
  HTMLDialogElement,
  FullscreenBlockOverlayProps
>(({ isOpen, onClose, children, title }, forwardedRef) => {
  // Lock body scroll and listen for Escape while open
  React.useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-9998 bg-black/80 backdrop-blur-sm" aria-hidden="true" />

      {/* Content — plain dialog element (no showModal, so no browser focus-trap) */}
      <dialog
        ref={forwardedRef}
        open
        aria-label={title}
        className="fixed inset-0 z-9999 m-0 h-screen w-screen max-w-none border-0 bg-background p-0 focus:outline-none"
      >
        {children}
      </dialog>
    </>
  );
});

FullscreenBlockOverlay.displayName = 'FullscreenBlockOverlay';
