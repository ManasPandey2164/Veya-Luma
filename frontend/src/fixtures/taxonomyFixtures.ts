/**
 * CANONICAL TAXONOMY FIXTURES FOR VEYA LUMA
 * Derived from research/taxonomy.md and research/onboarding.md.
 */

export interface TaxonomyOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}

export const TASTE_GENRES: TaxonomyOption[] = [
  { id: 'sci-fi', label: 'Sci-Fi', description: 'Speculative worlds & futuristic technology' },
  { id: 'thriller', label: 'Thriller', description: 'High-stakes suspense & cerebral tension' },
  { id: 'drama', label: 'Drama', description: 'Deep human emotions & moral dilemmas' },
  { id: 'mystery', label: 'Mystery', description: 'Puzzle narratives & unsolved secrets' },
  { id: 'neo-noir', label: 'Neo-Noir', description: 'Stylized nocturnal cynicism & morally grey characters' },
  { id: 'art-house', label: 'Art-House', description: 'Auteur vision, poetic pacing & formal experimentation' },
  { id: 'crime', label: 'Crime', description: 'Underworld dynamics & psychological friction' },
  { id: 'philosophy', label: 'Philosophy', description: 'Existential inquiries into consciousness & reality' },
  { id: 'romance', label: 'Romance', description: 'Intimacy, longing & emotional restraint' },
  { id: 'comedy', label: 'Black Comedy', description: 'Sharp wit, irony & biting social satire' },
];

export const TASTE_MOODS: TaxonomyOption[] = [
  { id: 'atmospheric', label: 'Atmospheric', description: 'Immersive soundscapes & enveloping visual aura' },
  { id: 'contemplative', label: 'Contemplative', description: 'Meditative tempo that invites deep reflection' },
  { id: 'tense', label: 'Tense', description: 'Palpable suspense & heightened psychological stakes' },
  { id: 'thought-provoking', label: 'Thought-provoking', description: 'Complex conceptual ideas that linger after the credits' },
  { id: 'meditative', label: 'Meditative', description: 'Calm, poetic & unhurried visual rhythm' },
  { id: 'melancholic', label: 'Melancholic', description: 'Bittersweet longing, solitude & delicate sadness' },
  { id: 'visceral', label: 'Visceral', description: 'High-impact tactile energy & sensory charge' },
  { id: 'dark', label: 'Dark', description: 'Shadowy, nocturnal & uncompromising emotional depth' },
  { id: 'mind-bending', label: 'Mind-bending', description: 'Non-linear form & cognitive disorientation' },
  { id: 'satirical', label: 'Satirical', description: 'Ironic subversion & sharp societal dissection' },
];

export const TASTE_THEMES: TaxonomyOption[] = [
  { id: 'ai-identity', label: 'Artificial Intelligence & Identity', description: 'Consciousness, simulated humanity & identity' },
  { id: 'memory-time', label: 'Memory & Determinism', description: 'Subjective recollection & the illusion of temporal order' },
  { id: 'existentialism', label: 'Existentialism & Isolation', description: 'Searching for meaning in an indifferent cosmos' },
  { id: 'class-conflict', label: 'Class Conflict & Power', description: 'Socioeconomic divides & symbiotic survival' },
  { id: 'grief-loss', label: 'Grief & Transcendence', description: 'Processing loss across emotional and cosmic frontiers' },
  { id: 'morality-vengeance', label: 'Morality & Retribution', description: 'Codes of honor, violence & personal ethics' },
  { id: 'human-nature', label: 'Human Nature & Desires', description: 'Unconscious impulses & fundamental human limits' },
  { id: 'communication', label: 'Communication & Connection', description: 'Bridging alien or emotional chasms through language' },
];

export const TASTE_VIEWING_PREFERENCES = {
  languages: [
    { id: 'english', label: 'English & Domestic Cinema', description: 'Primary English-language releases' },
    { id: 'world', label: 'World Cinema (Subtitles welcome)', description: 'International auteur cinema across all tongues' },
    { id: 'original-audio', label: 'Always Original Audio', description: 'Preserving authentic cultural voice and vocal cadence' },
  ],
  runtimes: [
    { id: 'any', label: 'Any Duration', description: 'Open to both brisk vignettes and expansive epics' },
    { id: 'concise', label: 'Focused & Concise', description: 'Prefers tight pacing under 115 minutes' },
    { id: 'extended', label: 'Expansive & Epic', description: 'Enjoys immersive slow-burns over 140 minutes' },
  ],
  pacing: [
    { id: 'contemplative', label: 'Slow-Burn & Contemplative', description: 'Patience rewarded with profound visual payoff' },
    { id: 'dynamic', label: 'Dynamic & Kinetic', description: 'Active rhythm and rapid narrative progression' },
    { id: 'flexible', label: 'Flexible / Form-Dependent', description: 'Pacing that serves the specific auteur vision' },
  ],
};
