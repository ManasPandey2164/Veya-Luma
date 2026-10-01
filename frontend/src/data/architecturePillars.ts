/**
 * Architectural foundation pillars per ARCHITECTURE.md and DECISION.md.
 * Kept as structured fixture data for development diagnostics and system verification.
 */
export interface ArchitecturePillar {
  title: string;
  desc: string;
  tag: string;
  color: string;
}

export const ARCHITECTURE_PILLARS: ArchitecturePillar[] = [
  {
    title: 'Taste Discovery Engine',
    desc: 'Adaptive two-stage preference elicitation with seen picker and pairwise movie duels.',
    tag: 'Phase 6',
    color: 'from-luminous-cyan to-blue-500',
  },
  {
    title: 'Content-Based Scorer',
    desc: 'Sparse TF-IDF and scaled structured metadata feature vectors with popularity fallback.',
    tag: 'Phase 7',
    color: 'from-luminous-ultraviolet to-purple-600',
  },
  {
    title: 'MMR & Diversity Caps',
    desc: 'Deterministic Maximal Marginal Relevance preventing franchise and tonal monotony.',
    tag: 'Phase 9',
    color: 'from-luminous-teal to-emerald-600',
  },
  {
    title: 'Radical Honesty & DNA',
    desc: 'Topological node map and radar telemetry explaining algorithmic resonance.',
    tag: 'Phase 8',
    color: 'from-luminous-amber to-orange-500',
  },
];
