import React, { useState } from 'react';
import { Search, Sparkles, Compass, Eye, ShieldCheck, ArrowRight } from 'lucide-react';
import { DISCOVERY_SEEDS } from '../data/discoverySeeds';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';

export const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const features = [
    {
      icon: Compass,
      title: 'Adaptive Taste Discovery',
      description:
        'Learn your cinematic preferences through instinctive pairwise duels and lightweight recognition rather than sterile questionnaires.',
      accent: 'text-luminous-cyan',
    },
    {
      icon: Eye,
      title: 'Radical Algorithmic Honesty',
      description:
        'Transparent dimensional resonance scores that clearly explain why a film fits your profile—and candidly reveal where it diverges.',
      accent: 'text-luminous-ultraviolet',
    },
    {
      icon: ShieldCheck,
      title: 'Curatorial Sanctuary',
      description:
        'Pure discovery untainted by streaming rights, ad agendas, or corporate catalog silos. Built exclusively to find your next great film.',
      accent: 'text-luminous-teal',
    },
  ];

  const handleSeedClick = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full max-w-5xl mx-auto pt-20 pb-16 px-6 text-center">
        {/* Ambient atmospheric glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-luminous-cyan/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-luminous-ultraviolet/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-luminous-cyan mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cinematic Discovery Redefined</span>
        </div>

        <h1 className="font-editorial text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Where Cinema Meets Personal Resonance
        </h1>

        <p className="mt-6 text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-sans">
          A personalized movie discovery engine engineered to overcome decision fatigue through
          intuitive taste learning rather than exhaustive questionnaires.
        </p>

        {/* Natural Language Discovery Portal (DESIGN.md 5.2) */}
        <div className="mt-12 w-full max-w-2xl mx-auto">
          <div className="relative flex items-center glass-card rounded-2xl p-2 border border-white/10 shadow-2xl focus-within:border-luminous-cyan/50 focus-within:shadow-cyan-glow transition-all duration-300">
            <Search className="w-5 h-5 text-slate-400 ml-3 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Describe a feeling, mood, visual aesthetic, or auteur..."
              className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none px-2 py-2.5 font-sans"
            />
            <button
              type="button"
              className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-luminous-cyan to-luminous-ultraviolet text-obsidian-void font-semibold text-xs hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-md"
            >
              <span>Discover</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Seed discovery prompt chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-slate-400 mr-1">Try exploring:</span>
            {DISCOVERY_SEEDS.map((seed) => (
              <button
                key={seed.id}
                type="button"
                onClick={() => handleSeedClick(seed.query)}
                className="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-colors"
              >
                {seed.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Discovery Philosophy Grid */}
      <section className="w-full max-w-5xl mx-auto px-6 py-16 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="font-editorial text-2xl md:text-3xl font-bold text-white">
            Designed for Cinematic Insight
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            Moving beyond opaque star ratings and streaming silos into nuanced emotional resonance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="glass-card rounded-2xl p-6 flex flex-col justify-between border border-white/5 hover:border-white/15 transition-all duration-300"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                    <Icon className={cn('w-5 h-5', feature.accent)} />
                  </div>
                  <h3 className="font-editorial text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Taste Discovery Callout */}
        <div className="mt-12 glass-card rounded-2xl p-8 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-luminous-cyan">
              Interactive Calibration
            </span>
            <h3 className="font-editorial text-xl font-bold text-white mt-1">
              Begin Your Taste Discovery Journey
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Calibrate your taste profile in under two minutes with intuitive cinematic duels.
            </p>
          </div>
          <Link
            to="/taste-discovery"
            className="shrink-0 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors flex items-center gap-2"
          >
            <span>Explore Taste Discovery</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
