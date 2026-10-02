import React from 'react';
import { cn } from '../../utils/cn';

export interface CelestialPrismProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  glow?: boolean;
}

/**
 * Abstract Celestial Radiant Prism Mark (DESIGN.md 5.1).
 * Replaces generic AI sparkle icons with an auteur celestial prism.
 */
export const CelestialPrism: React.FC<CelestialPrismProps> = ({
  size = 20,
  glow = true,
  className,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'shrink-0 transition-transform duration-300',
        glow && 'filter drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]',
        className
      )}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id="prism-cyan-violet" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00F0FF" />
          <stop offset="0.5" stopColor="#14F195" />
          <stop offset="1" stopColor="#8A5CFF" />
        </linearGradient>
        <linearGradient id="facet-light" x1="12" y1="2" x2="12" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="1" stopColor="#00F0FF" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="facet-shadow" x1="12" y1="12" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8A5CFF" stopOpacity="0.6" />
          <stop offset="1" stopColor="#06080E" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Outer Radiant Diamond Prism */}
      <path
        d="M12 2L21 8.5L18 20L12 22L6 20L3 8.5L12 2Z"
        stroke="url(#prism-cyan-violet)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Central Upper Facet */}
      <path
        d="M12 2L17 9L12 12L7 9L12 2Z"
        fill="url(#facet-light)"
        fillOpacity="0.3"
        stroke="#00F0FF"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      {/* Lower Refraction Core */}
      <path
        d="M12 12L17 9L18 20L12 22L6 20L7 9L12 12Z"
        fill="url(#facet-shadow)"
        fillOpacity="0.4"
      />
      {/* Radiant Central Filament */}
      <line
        x1="12"
        y1="2"
        x2="12"
        y2="22"
        stroke="#00F0FF"
        strokeWidth="1"
        strokeOpacity="0.7"
      />
      <line
        x1="3"
        y1="8.5"
        x2="21"
        y2="8.5"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.75"
      />
    </svg>
  );
};

export default CelestialPrism;
