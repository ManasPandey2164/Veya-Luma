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
    id: 'mind-bending-sci-fi',
    label: 'Mind-bending sci-fi',
    query: 'mind-bending sci-fi with philosophical depth',
    category: 'genre',
  },
  {
    id: 'interstellar-less-bleak',
    label: 'Like Interstellar, less bleak',
    query: 'epic space exploration with hopeful tone',
    category: 'comparison',
  },
  {
    id: 'atmospheric-neo-noir',
    label: 'Atmospheric neo-noir',
    query: 'rain-soaked city neo-noir with saxophone score',
    category: 'mood',
  },
  {
    id: 'cerebral-90s-thriller',
    label: 'Cerebral 90s thriller',
    query: 'complex psychological thriller from the 1990s',
    category: 'thematic',
  },
  {
    id: 'acoustic-solitude',
    label: 'Acoustic solitude',
    query: 'quiet contemplative character studies in wilderness',
    category: 'mood',
  },
];
