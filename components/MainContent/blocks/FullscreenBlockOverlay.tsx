'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface FullscreenBlockOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

/**
 * FullscreenBlockOverlay — renders a fullscreen overlay for Diagram/Whiteboard blocks.
 *
 * Provides a fixed, fullscreen dialog with a close button in the top-right corner.
 * Pressing Escape will close the overlay.
 *
 * Usage:
 *   const [isFullscreen, setIsFullscreen] = useState(false);
 *
 *   return (
 *     <>
 *       <button onClick={() => setIsFullscreen(true)}>Fullscreen</button>
 *       <FullscreenBlockOverlay
 *         isOpen={isFullscreen}
 *         onClose={() => setIsFullscreen(false)}
 *       >
 *         <DiagramBlock {...props} />
 *       </FullscreenBlockOverlay>
 *     </>
 *   );
 */
export const FullscreenBlockOverlay = React.forwardRef<
  HTMLDivElement,
  FullscreenBlockOverlayProps
>(({ isOpen, onClose, children, title }, forwardedRef) => {
  const { t } = useI18n();

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-9998 bg-black/80 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-0 z-9999 w-screen max-w-none border-0 bg-background p-0 shadow-none focus:outline-none">
          {/* Visually hidden title for accessibility */}
          <DialogPrimitive.Title className="sr-only">
            {title || t('ui.fullscreen')}
          </DialogPrimitive.Title>

          {/* Close button - positioned below toolbar to avoid overlap */}
          <div className="absolute right-4 top-16 z-10">
            <button
              type="button"
              onClick={onClose}
              aria-label={t('ui.exitFullscreen')}
              title={t('ui.exitFullscreen')}
              className={cn(
                'rounded-full bg-background/90 backdrop-blur-sm p-2 text-muted-foreground shadow-lg border border-border transition-colors',
                'hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Fullscreen content */}
          <div className="h-screen w-screen overflow-auto" ref={forwardedRef}>
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
});

FullscreenBlockOverlay.displayName = 'FullscreenBlockOverlay';
