import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

import {
  PageContainer,
  SectionHeader,
  GlassPanel,
  Tag,
  Button,
  StateSwitcher,
  usePageState,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../components/ui';

export const PreferencesPage: React.FC = () => {
  const [pageState, setPageState] = usePageState('populated');
  const location = useLocation();

  const isRecsTab = location.pathname.includes('/recommendations');
  const activeTab = isRecsTab ? 'recommendations' : 'taste';

  // Local mock state for interactive preference toggles
  const [genres, setGenres] = useState([
    { name: 'Sci-Fi', selected: true },
    { name: 'Neo-Noir', selected: true },
    { name: 'Psychological', selected: true },
    { name: 'Mystery', selected: true },
    { name: 'Historical Drama', selected: false },
    { name: 'Horror', selected: false },
    { name: 'Animation', selected: false },
    { name: 'Comedy', selected: false },
  ]);

  const [noveltyWeight, setNoveltyWeight] = useState(70);
  const [diversityCap, setDiversityCap] = useState(85);
  const [indieTolerance, setIndieTolerance] = useState(60);

  const toggleGenre = (index: number) => {
    setGenres((prev) =>
      prev.map((g, i) => (i === index ? { ...g, selected: !g.selected } : g))
    );
  };

  return (
    <PageContainer maxWidth="standard" paddingY="md" withAtmosphere>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <SectionHeader
          eyebrow="TASTE CALIBRATION & CONTROLS"
          title="Discovery Preferences"
          description="Adjust the explicit facets and algorithmic tuning dials governing your cinematic recommendations."
          className="mb-0"
        />
        <StateSwitcher state={pageState} onStateChange={setPageState} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-8 font-sans">
        <Link
          to="/preferences/taste"
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'taste'
              ? 'bg-luminous-cyan text-obsidian-void font-semibold shadow-cyan-glow'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Taste Preferences
        </Link>
        <Link
          to="/preferences/recommendations"
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'recommendations'
              ? 'bg-luminous-cyan text-obsidian-void font-semibold shadow-cyan-glow'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Recommendation Calibration
        </Link>
      </div>

      {pageState === 'loading' && (
        <LoadingState type="cards" count={3} message="Retrieving calibrated preference profiles..." />
      )}

      {pageState === 'error' && (
        <ErrorState
          title="Preference Vector Synchronization Failed"
          message="Could not load preference calibration data from local storage."
          onRetry={() => setPageState('populated')}
        />
      )}

      {pageState === 'empty' && (
        <EmptyState
          title="No Custom Preferences Recorded"
          description="You are currently discovering cinema with default curatorial baselines."
          action={
            <Button size="sm" onClick={() => setPageState('populated')}>
              Initialize Custom Profile
            </Button>
          }
        />
      )}

      {pageState === 'populated' && (
        <div className="max-w-3xl space-y-8 font-sans">
          {activeTab === 'taste' ? (
            /* Taste Preferences View */
            <div className="space-y-6">
              <GlassPanel elevation="plate" padding="lg" rounded="2xl">
                <h3 className="font-editorial text-xl font-bold text-white mb-2">
                  Active Genre Affinities
                </h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Select themes and cinematic formats you want emphasized in candidate retrieval.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {genres.map((g, idx) => (
                    <Tag
                      key={g.name}
                      label={g.name}
                      interactive
                      selected={g.selected}
                      onToggle={() => toggleGenre(idx)}
                    />
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel elevation="plate" padding="lg" rounded="2xl">
                <h3 className="font-editorial text-xl font-bold text-white mb-2">
                  Pacing & Era Tolerance
                </h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Configure structural tolerances for narrative speed and chronological breadth.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-surface border border-white/5">
                    <div>
                      <span className="text-xs font-semibold text-white block">Slow-Burn Narratives</span>
                      <span className="text-[11px] text-slate-400">Allow films emphasizing mood over plot velocity</span>
                    </div>
                    <Tag label="Preferred" interactive selected />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-surface border border-white/5">
                    <div>
                      <span className="text-xs font-semibold text-white block">Classic & Golden Era (Pre-1980)</span>
                      <span className="text-[11px] text-slate-400">Include historical masterworks in discovery pool</span>
                    </div>
                    <Tag label="Active" interactive selected />
                  </div>
                </div>
              </GlassPanel>
            </div>
          ) : (
            /* Recommendation Calibration View */
            <div className="space-y-6">
              <GlassPanel elevation="plate" padding="lg" rounded="2xl">
                <h3 className="font-editorial text-xl font-bold text-white mb-2">
                  Algorithmic Novelty & Exploration
                </h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Control the balance between safe, highly familiar suggestions and unexpected discoveries.
                </p>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-300 font-medium">Novelty Appetite</span>
                      <span className="text-luminous-cyan font-semibold">{noveltyWeight}% (High Discovery)</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={noveltyWeight}
                      onChange={(e) => setNoveltyWeight(Number(e.target.value))}
                      className="w-full accent-luminous-cyan h-1 bg-obsidian-plate rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-300 font-medium">MMR Diversity Dispersion</span>
                      <span className="text-luminous-cyan font-semibold">{diversityCap}% (Varied Genres)</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={diversityCap}
                      onChange={(e) => setDiversityCap(Number(e.target.value))}
                      className="w-full accent-luminous-cyan h-1 bg-obsidian-plate rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-300 font-medium">Independent & Art-House Weighting</span>
                      <span className="text-luminous-cyan font-semibold">{indieTolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={indieTolerance}
                      onChange={(e) => setIndieTolerance(Number(e.target.value))}
                      className="w-full accent-luminous-cyan h-1 bg-obsidian-plate rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </GlassPanel>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default PreferencesPage;
