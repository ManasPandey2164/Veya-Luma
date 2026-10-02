/**
 * Natural language discovery seeds per DESIGN.md (Section 5.2).
 * Provides starting discovery cues for intuitive cinematic navigation.
 */
export interface DiscoverySeed {
  id: string;
  label: string;
  query: string;
  category: 'mood' | 'genre' | 'comparison' | 'thematic';
}

export const DISCOVERY_SEEDS: DiscoverySeed[] = [
  {
    id: 'atmospheric-unsettling',
    label: 'Find me something atmospheric and unsettling.',
    query: 'Find me something atmospheric and unsettling.',
    category: 'mood',
  },
  {
    id: 'interstellar-intimate',
    label: 'Something like Interstellar, but more intimate.',
    query: 'Something like Interstellar, but more intimate.',
    category: 'comparison',
  },
  {
    id: 'clever-mystery',
    label: 'Give me a clever mystery for tonight.',
    query: 'Give me a clever mystery for tonight.',
    category: 'thematic',
  },
  {
    id: 'slow-burn-scifi',
    label: 'Find a beautiful slow-burn sci-fi film.',
    query: 'Find a beautiful slow-burn sci-fi film.',
    category: 'genre',
  },
  {
    id: 'mind-bending-sci-fi',
    label: 'Mind-bending sci-fi',
    query: 'mind-bending sci-fi with philosophical depth',
    category: 'genre',
  },
  {
    id: 'atmospheric-neo-noir',
    label: 'Atmospheric neo-noir',
    query: 'rain-soaked city neo-noir with saxophone score',
    category: 'mood',
  },
];
