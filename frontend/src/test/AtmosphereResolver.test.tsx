import { describe, it, expect } from 'vitest';
import {
  resolveCinematicAtmosphere,
  DEFAULT_ATMOSPHERE_PROFILE,
} from '../theme/atmosphere';

describe('Cinematic Atmosphere Foundation & Resolver', () => {
  describe('Supported Genre Atmospheric Resolution', () => {
    it('resolves Sci-Fi to luminous cyan and electric blue atmosphere', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Sci-Fi' });
      expect(tokens.accent).toBe('#00F0FF');
      expect(tokens.badgeVariant).toBe('cyan');
      expect(tokens.accentClass).toBe('text-luminous-cyan');
      expect(tokens.borderClass).toBe('border-luminous-cyan/40');
      expect(tokens.glowClass).toBe('shadow-cyan-glow');
    });

    it('resolves Drama to muted warm amber and gold atmosphere', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Drama' });
      expect(tokens.accent).toBe('#FFB443');
      expect(tokens.badgeVariant).toBe('amber');
      expect(tokens.accentClass).toBe('text-luminous-amber');
      expect(tokens.borderClass).toBe('border-luminous-amber/40');
      expect(tokens.glowClass).toBe('shadow-amber-glow');
    });

    it('resolves Thriller to restrained crimson atmosphere', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Thriller' });
      expect(tokens.accent).toBe('#FF4D6D');
      expect(tokens.badgeVariant).toBe('crimson');
      expect(tokens.accentClass).toBe('text-luminous-crimson');
      expect(tokens.borderClass).toBe('border-luminous-crimson/40');
      expect(tokens.glowClass).toBe('shadow-crimson-glow');
    });

    it('resolves Mystery to deep violet and nocturnal cyan atmosphere', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Mystery' });
      expect(tokens.accent).toBe('#7038FF');
      expect(tokens.badgeVariant).toBe('violet');
      expect(tokens.accentClass).toBe('text-secondary');
    });

    it('resolves Romance to rose and burgundy atmosphere', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Romance' });
      expect(tokens.accent).toBe('#FF5E8E');
      expect(tokens.badgeVariant).toBe('crimson');
    });

    it('resolves Adventure to atmospheric emerald/teal', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Adventure' });
      expect(tokens.accent).toBe('#14F195');
      expect(tokens.badgeVariant).toBe('teal');
      expect(tokens.accentClass).toBe('text-accent-teal');
    });

    it('resolves Comedy and Black Comedy alias to warm amber/orange', () => {
      const comedyTokens = resolveCinematicAtmosphere({ genre: 'Comedy' });
      const blackComedyTokens = resolveCinematicAtmosphere({ genre: 'Black Comedy' });
      expect(comedyTokens.accent).toBe('#FFB443');
      expect(blackComedyTokens.accent).toBe('#FFB443');
      expect(comedyTokens.badgeVariant).toBe('amber');
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
  });

  describe('Base Theme (Dark vs Light) Compatibility', () => {
    it('defaults to dark base theme with obsidian-compatible tints and luminous highlights', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Sci-Fi' });
      expect(tokens.surfaceTint).toBe('rgba(0, 240, 255, 0.05)');
      expect(tokens.accentClass).toBe('text-luminous-cyan');
    });

    it('resolves light base theme variant with tuned optical contrast without turning genre into a separate theme', () => {
      const tokens = resolveCinematicAtmosphere({ genre: 'Sci-Fi', baseTheme: 'light' });
      expect(tokens.accent).toBe('#00838F'); // Tuned high-contrast cyan for light backgrounds
      expect(tokens.surfaceTint).toBe('rgba(0, 131, 143, 0.03)');
      expect(tokens.accentClass).toBe('text-cyan-800');
    });

    it('resolves light default theme fallback correctly', () => {
      const lightDefault = resolveCinematicAtmosphere({ baseTheme: 'light' });
      expect(lightDefault).toEqual(DEFAULT_ATMOSPHERE_PROFILE.light);
      expect(lightDefault.surfaceTint).toBe('rgba(0, 151, 167, 0.03)');
    });
  });
});
