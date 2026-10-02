import { describe, it, expect } from 'vitest';
import {
  resolveCinematicAtmosphere,
  DEFAULT_ATMOSPHERE_PROFILE,
  GENRE_ATMOSPHERE_PROFILES,
  getAtmosphereCssVariables,
} from '../theme/atmosphere';

describe('Cinematic Atmosphere Foundation & Resolver', () => {
  describe('Default Atmosphere Profiles', () => {
    it('resolves default dark atmosphere (Cinematic Luminary Dark)', () => {
      const tokens = resolveCinematicAtmosphere();
      expect(tokens).toEqual(DEFAULT_ATMOSPHERE_PROFILE.dark);
      expect(tokens.accent).toBe('#00F0FF');
      expect(tokens.secondaryAccent).toBe('#8A5CFF');
      expect(tokens.glowColor).toBe('rgba(0, 240, 255, 0.25)');
      expect(tokens.badgeVariant).toBe('cyan');
      expect(tokens.accentClass).toBe('text-luminous-cyan');
    });

    it('resolves default light atmosphere (Cinematic Luminary Light)', () => {
      const tokens = resolveCinematicAtmosphere({ baseTheme: 'light' });
      expect(tokens).toEqual(DEFAULT_ATMOSPHERE_PROFILE.light);
      expect(tokens.accent).toBe('#0097A7');
      expect(tokens.secondaryAccent).toBe('#6A1B9A');
      expect(tokens.glowColor).toBe('rgba(0, 151, 167, 0.2)');
      expect(tokens.badgeVariant).toBe('cyan');
      expect(tokens.accentClass).toBe('text-teal-700');
    });
  });

  describe('Supported Genre Atmospheric Resolution (Dark & Light)', () => {
    // 1. Sci-Fi
    it('resolves Sci-Fi dark to luminous cyan and electric blue atmosphere', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Sci-Fi', baseTheme: 'dark' });
      expect(tokens.accent).toBe('#00F0FF');
      expect(tokens.secondaryAccent).toBe('#7038FF');
      expect(tokens.badgeVariant).toBe('cyan');
      expect(tokens.accentClass).toBe('text-luminous-cyan');
      expect(tokens.borderClass).toBe('border-luminous-cyan/40');
      expect(tokens.glowClass).toBe('shadow-cyan-glow');
    });

    it('resolves Sci-Fi light to tuned deep cyan for light paper contrast', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Sci-Fi', baseTheme: 'light' });
      expect(tokens.accent).toBe('#00838F');
      expect(tokens.secondaryAccent).toBe('#4A148C');
      expect(tokens.badgeVariant).toBe('cyan');
      expect(tokens.accentClass).toBe('text-cyan-800');
      expect(tokens.borderClass).toBe('border-cyan-700/30');
    });

    // 2. Thriller
    it('resolves Thriller dark to restrained crimson/wine atmosphere', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Thriller', baseTheme: 'dark' });
      expect(tokens.accent).toBe('#FF4D6D');
      expect(tokens.secondaryAccent).toBe('#D82855');
      expect(tokens.badgeVariant).toBe('crimson');
      expect(tokens.accentClass).toBe('text-luminous-crimson');
      expect(tokens.glowClass).toBe('shadow-crimson-glow');
    });

    it('resolves Thriller light to deep rose/wine with high text contrast', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Thriller', baseTheme: 'light' });
      expect(tokens.accent).toBe('#C2185B');
      expect(tokens.secondaryAccent).toBe('#880E4F');
      expect(tokens.badgeVariant).toBe('crimson');
      expect(tokens.accentClass).toBe('text-rose-800');
    });

    // 3. Mystery
    it('resolves Mystery dark to deep violet and nocturnal cyan atmosphere', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Mystery', baseTheme: 'dark' });
      expect(tokens.accent).toBe('#7038FF');
      expect(tokens.secondaryAccent).toBe('#00F0FF');
      expect(tokens.badgeVariant).toBe('violet');
      expect(tokens.accentClass).toBe('text-secondary');
    });

    it('resolves Mystery light to deep indigo and violet for light background', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Mystery', baseTheme: 'light' });
      expect(tokens.accent).toBe('#4527A0');
      expect(tokens.secondaryAccent).toBe('#00838F');
      expect(tokens.badgeVariant).toBe('violet');
      expect(tokens.accentClass).toBe('text-indigo-800');
    });

    // 4. Drama
    it('resolves Drama dark to warm amber and solar gold', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Drama', baseTheme: 'dark' });
      expect(tokens.accent).toBe('#FFB443');
      expect(tokens.badgeVariant).toBe('amber');
      expect(tokens.accentClass).toBe('text-luminous-amber');
    });

    it('resolves Drama light to refined burnt amber and ochre', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Drama', baseTheme: 'light' });
      expect(tokens.accent).toBe('#B26A00');
      expect(tokens.badgeVariant).toBe('amber');
      expect(tokens.accentClass).toBe('text-amber-800');
    });

    // 5. Romance
    it('resolves Romance to rose and burgundy atmosphere', () => {
      const darkTokens = resolveCinematicAtmosphere({ genre: 'Romance', baseTheme: 'dark' });
      const lightTokens = resolveCinematicAtmosphere({ genre: 'Romance', baseTheme: 'light' });
      expect(darkTokens.accent).toBe('#FF5E8E');
      expect(lightTokens.accent).toBe('#AD1457');
    });

    // 6. Adventure
    it('resolves Adventure to atmospheric emerald/teal', () => {
      const darkTokens = resolveCinematicAtmosphere({ genre: 'Adventure', baseTheme: 'dark' });
      const lightTokens = resolveCinematicAtmosphere({ genre: 'Adventure', baseTheme: 'light' });
      expect(darkTokens.accent).toBe('#14F195');
      expect(lightTokens.accent).toBe('#00796B');
    });
  });

  describe('Genre Aliases & Normalization', () => {
    it('resolves diverse aliases correctly to canonical profiles', () => {
      expect(resolveCinematicAtmosphere({ genre: 'science fiction' }).accent).toBe(
        GENRE_ATMOSPHERE_PROFILES['sci-fi'].dark.accent
      );
      expect(resolveCinematicAtmosphere({ genre: 'scifi' }).accent).toBe(
        GENRE_ATMOSPHERE_PROFILES['sci-fi'].dark.accent
      );
      expect(resolveCinematicAtmosphere({ genre: 'psychological' }).accent).toBe(
        GENRE_ATMOSPHERE_PROFILES['thriller'].dark.accent
      );
      expect(resolveCinematicAtmosphere({ genre: 'crime' }).accent).toBe(
        GENRE_ATMOSPHERE_PROFILES['thriller'].dark.accent
      );
      expect(resolveCinematicAtmosphere({ genre: 'noir' }).accent).toBe(
        GENRE_ATMOSPHERE_PROFILES['neo-noir'].dark.accent
      );
      expect(resolveCinematicAtmosphere({ genre: 'art-house' }).accent).toBe(
        GENRE_ATMOSPHERE_PROFILES['mystery'].dark.accent
      );
      expect(resolveCinematicAtmosphere({ genre: 'black comedy' }).accent).toBe(
        GENRE_ATMOSPHERE_PROFILES['comedy'].dark.accent
      );
      expect(resolveCinematicAtmosphere({ genre: 'action' }).accent).toBe(
        GENRE_ATMOSPHERE_PROFILES['adventure'].dark.accent
      );
    });

    it('normalizes casing and trailing whitespace', () => {
      const mixedCase = resolveCinematicAtmosphere({ genre: '  ScI-Fi  ' });
      expect(mixedCase.accent).toBe(GENRE_ATMOSPHERE_PROFILES['sci-fi'].dark.accent);
    });
  });

  describe('Fallback Behavior for Unsupported / Missing Genre', () => {
    it('falls back to default Cinematic Luminary atmosphere when genre is unsupported', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'UnrecognizedGenre123' });
      expect(tokens).toEqual(DEFAULT_ATMOSPHERE_PROFILE.dark);
      expect(tokens.accent).toBe('#00F0FF');
      expect(tokens.badgeVariant).toBe('cyan');
    });

    it('falls back to default Cinematic Luminary atmosphere when no genre is provided or null', () => {
      const noArgTokens = resolveCinematicAtmosphere();
      const nullTokens = resolveCinematicAtmosphere({ genre: null });
      const emptyTokens = resolveCinematicAtmosphere({ genre: '   ' });

      expect(noArgTokens).toEqual(DEFAULT_ATMOSPHERE_PROFILE.dark);
      expect(nullTokens).toEqual(DEFAULT_ATMOSPHERE_PROFILE.dark);
      expect(emptyTokens).toEqual(DEFAULT_ATMOSPHERE_PROFILE.dark);
    });

    it('falls back to light default when baseTheme is light and genre is unsupported', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'UnrecognizedGenre123', baseTheme: 'light' });
      expect(tokens).toEqual(DEFAULT_ATMOSPHERE_PROFILE.light);
      expect(tokens.accent).toBe('#0097A7');
    });
  });

  describe('CSS Custom Property Generation', () => {
    it('maps atmosphere tokens to standard CSS custom properties', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Sci-Fi' });
      const cssVars = getAtmosphereCssVariables(tokens);

      expect(cssVars['--vl-accent']).toBe('#00F0FF');
      expect(cssVars['--vl-accent-secondary']).toBe('#7038FF');
      expect(cssVars['--vl-atmosphere-glow']).toBe('rgba(0, 240, 255, 0.3)');
      expect(cssVars['--vl-atmosphere-surface']).toBe('rgba(0, 240, 255, 0.05)');
      expect(cssVars['--vl-atmosphere-gradient']).toContain('radial-gradient');
      expect(cssVars['--vl-atmosphere-border']).toContain('linear-gradient');
    });
  });
});
