import { useContext, useEffect } from 'react';
import { AtmosphereContext, type AtmosphereContextValue } from './AtmosphereContext';

/**
 * Access the active cinematic atmosphere context, tokens, and controls.
 */
export function useAtmosphere(): AtmosphereContextValue {
  return useContext(AtmosphereContext);
}

/**
 * Helper hook for pages to declare and manage their contextual atmosphere while mounted.
 * Automatically cleans up on unmount.
 */
export function useSetAtmosphere(genre: string | null | undefined): void {
  const { setAtmosphereGenre, resetAtmosphere } = useAtmosphere();

  useEffect(() => {
    if (genre !== undefined) {
      setAtmosphereGenre(genre);
    }
    return () => {
      resetAtmosphere();
    };
  }, [genre, setAtmosphereGenre, resetAtmosphere]);
}
