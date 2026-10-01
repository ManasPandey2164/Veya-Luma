import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('Veya Luma Frontend App', () => {
  it('renders the brand title and hero headline', () => {
    render(<App />);
    const brandElements = screen.getAllByText('Veya Luma');
    expect(brandElements.length).toBeGreaterThan(0);
    expect(
      screen.getByText('Where Cinema Meets Personal Resonance')
    ).toBeInTheDocument();
  });

  it('renders the system connectivity widget', () => {
    render(<App />);
    expect(
      screen.getByText('System Connectivity & Health')
    ).toBeInTheDocument();
  });

  it('renders the Phase 0 architectural readiness pillars', () => {
    render(<App />);
    expect(screen.getByText('Taste Discovery Engine')).toBeInTheDocument();
    expect(screen.getByText('Content-Based Scorer')).toBeInTheDocument();
    expect(screen.getByText('MMR & Diversity Caps')).toBeInTheDocument();
  });
});
