import React from 'react';
import { cn } from '../../utils/cn';
import { Navbar } from '../Navbar';
import { Footer } from '../Footer';
import { usePreferences, useAtmosphere } from '../../context';

export interface AppShellProps {
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  ambientAura?: boolean;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  headerSlot,
  footerSlot,
  ambientAura = true,
  className,
}) => {
  const { accountPreferences } = usePreferences();
  const { tokens } = useAtmosphere();
  const isLight = accountPreferences?.baseTheme === 'light';

  return (
    <div
      data-theme={accountPreferences?.baseTheme || 'dark'}
      className={cn(
        'relative min-h-screen flex flex-col font-sans transition-colors duration-300 selection:bg-luminous-cyan selection:text-obsidian-void',
        isLight ? 'bg-[#F7F5F0] text-[#12151B]' : 'bg-[#06080E] text-slate-100',
        className
      )}
      style={{
        backgroundColor: 'var(--vl-bg-base)',
        color: 'var(--vl-text-primary)',
      }}
    >
      {/* LAYER 1: Multi-layer Cinematic Atmospheric Ambient Environment (z-0, above base background) */}
      {ambientAura && (
        <div
          data-testid="app-shell-ambient-aura"
          className={cn(
            'fixed inset-0 pointer-events-none z-0 overflow-hidden transition-all duration-700',
            isLight ? 'opacity-40' : 'opacity-65'
          )}
          style={{
            background: isLight ? undefined : tokens.gradient.radial,
          }}
          aria-hidden="true"
        >
          {/* Primary atmospheric bloom (top peripheral bloom) */}
          <div
            className={cn(
              'absolute -top-48 left-1/2 -translate-x-1/2 w-[1200px] h-[650px] rounded-full blur-[140px] pointer-events-none transition-all duration-700',
              isLight ? 'opacity-35' : 'opacity-70'
            )}
            style={{
              background: `radial-gradient(circle at 50% 30%, ${tokens.accent}${isLight ? '18' : '45'} 0%, ${tokens.glowColor} 45%, transparent 75%)`,
            }}
          />

          {/* Secondary atmospheric bloom (asymmetric diagonal depth / right horizon) */}
          <div
            className={cn(
              'absolute top-24 -right-32 w-[900px] h-[700px] rounded-full blur-[150px] pointer-events-none transition-all duration-700',
              isLight ? 'opacity-25' : 'opacity-55'
            )}
            style={{
              background: `radial-gradient(circle at 50% 50%, ${tokens.secondaryAccent}${isLight ? '15' : '38'} 0%, transparent 65%)`,
            }}
          />

          {/* Environmental ambient surface tint (restrained in light mode) */}
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-700"
            style={{
              backgroundColor: tokens.surfaceTint,
              opacity: isLight ? 0.35 : 0.9,
            }}
          />
        </div>
      )}

      {/* LAYER 2: Application Content (Navigation, Main Content, Footer at z-10) */}
      <div className="relative z-10 flex flex-col flex-1 w-full">
        {/* Accessible Skip Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-luminous-cyan focus:text-obsidian-void focus:font-semibold focus:rounded-md focus:shadow-cyan-glow focus:outline-none"
        >
          Skip to main content
        </a>

        {/* Header Slot (Global Floating Nav Bar) */}
        <div className="w-full shrink-0">
          {headerSlot !== undefined ? headerSlot : <Navbar />}
        </div>

        {/* Main Content Area */}
        <main id="main-content" tabIndex={-1} className="flex-1 w-full focus:outline-none">
          {children}
        </main>

        {/* Footer Slot */}
        <div className="w-full shrink-0">
          {footerSlot !== undefined ? footerSlot : <Footer />}
        </div>
      </div>
    </div>
  );
};

export default AppShell;
