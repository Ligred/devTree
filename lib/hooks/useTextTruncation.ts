'use client';

import { useEffect, useState } from 'react';

export function useTextTruncation(elementRef: React.RefObject<HTMLElement | null>): boolean {
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const checkTruncation = () => {
      if (elementRef.current) {
        const element = elementRef.current;
        const isTruncatedNow = element.scrollWidth > element.clientWidth;
        setIsTruncated(isTruncatedNow);
      }
    };

    checkTruncation();

    window.addEventListener('resize', checkTruncation);
    const observer = new MutationObserver(checkTruncation);
    if (elementRef.current) {
      observer.observe(elementRef.current, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    return () => {
      window.removeEventListener('resize', checkTruncation);
      observer.disconnect();
    };
  }, [elementRef]);

  return isTruncated;
}
