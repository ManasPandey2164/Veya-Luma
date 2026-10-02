import React from 'react';
import { cn } from '../../utils/cn';
import { Navbar } from '../Navbar';
import { Footer } from '../Footer';

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
  return (
    <div
      className={cn(
        'relative min-h-screen flex flex-col bg-obsidian-void text-slate-100 font-sans selection:bg-luminous-cyan selection:text-obsidian-void',
        className
      )}
    >
      {/* Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-luminous-cyan focus:text-obsidian-void focus:font-semibold focus:rounded-md focus:shadow-cyan-glow focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Atmospheric Ambient Background Bleed (DESIGN.md 2.3) */}
      {ambientAura && (
        <div
          className="fixed inset-0 pointer-events-none -z-10 bg-cosmic-glow opacity-60"
          aria-hidden="true"
        />
      )}

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
  );
};

export default AppShell;
