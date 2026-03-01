import React from 'react';

import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export type SidebarTransition =
  | { duration: number }
  | { duration: number; ease: [number, number, number, number] };

interface SidebarProps {
  /** whether the sidebar is currently visible (desktop state) */
  visible: boolean;
  /** called when user wants the sidebar to appear */
  onShow: () => void;
  /** transition configuration for the animation */
  transition: SidebarTransition;
  /** optional mobile overlay control; if provided the sidebar will render
   * a second full-screen drawer when `mobile.open` is true. This keeps the
   * same content in sync between desktop and mobile. */
  mobileOverlay?: { open: boolean; onClose: () => void };
  /** children render the full sidebar content (header + body) */
  children: React.ReactNode;
}

export function Sidebar({
  visible,
  onShow,
  transition,
  mobileOverlay,
  children,
}: Readonly<SidebarProps>) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      {/* desktop/collapsible sidebar */}
      <AnimatePresence>
        <motion.aside
          className={`bg-card/80 border-border relative flex h-full flex-col overflow-hidden border-b md:border-r md:border-b-0 ${
            mobileOverlay ? 'hidden md:flex' : ''
          }`}
          initial={{ flexBasis: visible ? '256px' : '40px' }}
          animate={{ flexBasis: visible ? '256px' : '40px' }}
          transition={transition}
        >
          {/* wrapper keeps minimum width even when parent flexBasis is reduced */}
          <div className="w-full grow overflow-auto md:min-w-[256px]">{children}</div>

          {/* collapsed show button overlay (same as workspace) */}
          <motion.div
            className="border-border bg-card absolute inset-y-0 left-0 z-10 hidden w-10 items-start justify-center border-r py-3 md:flex"
            initial={false}
            animate={{ opacity: visible ? 0 : 1 }}
            transition={
              reducedMotion
                ? { duration: 0.01 }
                : {
                    duration: visible ? 0.1 : 0.16,
                    delay: visible ? 0 : 0.18,
                    ease: [0.22, 1, 0.36, 1],
                  }
            }
            style={{ pointerEvents: visible ? 'none' : 'auto' }}
            // aria-hidden removed to prevent warnings when the show button is focused
          >
            <button
              type="button"
              aria-label="Show sidebar"
              data-ui-sound-event="open"
              className="motion-interactive icon-pop-hover text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded p-1.5 transition-colors"
              onClick={onShow}
            >
              <ChevronRight size={20} />
            </button>
          </motion.div>
        </motion.aside>
      </AnimatePresence>

      {/* mobile full-screen drawer */}
      {mobileOverlay && (
        <AnimatePresence>
          {mobileOverlay.open && (
            <>
              {/* backdrop behind mobile drawer */}
              <motion.div
                key="mobile-sidebar-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: 'easeOut' }}
                className="fixed inset-0 z-40 bg-black/40 md:hidden"
                data-testid="mobile-sidebar-backdrop"
                aria-hidden="true"
                onClick={mobileOverlay.onClose}
              />

              <motion.aside
                key="mobile-sidebar"
                className="alive-surface border-border bg-card fixed inset-y-0 left-0 z-50 flex w-screen shrink-0 flex-col overflow-hidden border-r shadow-sm md:hidden"
                data-testid="mobile-sidebar"
                initial={{ x: '-100%' }}
                animate={{ width: '100vw', x: 0 }}
                exit={{ x: '-100%' }}
                transition={transition}
              >
                {/* reuse same children; they should include their own close button */}
                <div className="flex h-full w-screen min-w-screen flex-col">{children}</div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
