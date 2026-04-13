import { useEffect } from 'react';

/**
 * Warns the user before closing or navigating away from the page.
 * Call this in any page where generated content (resume, cover letter, etc.)
 * would be lost on navigation.
 *
 * @param {boolean} isActive - Set to true once content has been generated
 */
export function useWarnBeforeLeave(isActive = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isActive]);
}
