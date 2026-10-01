import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import { DiagnosticsPage } from '../pages/DiagnosticsPage';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('Veya Luma Frontend App', () => {
  it('renders the brand title and hero headline on the home page', () => {
    render(<App />);
    const brandElements = screen.getAllByText('Veya Luma');
    expect(brandElements.length).toBeGreaterThan(0);
    expect(
      screen.getByText('Where Cinema Meets Personal Resonance')
    ).toBeInTheDocument();
  });

  it('renders the natural language discovery portal and seeds on the home page', () => {
    render(<App />);
    expect(
      screen.getByPlaceholderText('Describe a feeling, mood, visual aesthetic, or auteur...')
    ).toBeInTheDocument();
    expect(screen.getByText('Mind-bending sci-fi')).toBeInTheDocument();
    expect(screen.getByText('Atmospheric neo-noir')).toBeInTheDocument();
  });

  it('renders system connectivity & health widget on the diagnostics page', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <DiagnosticsPage />
      </QueryClientProvider>
    );
    expect(
      screen.getByText('System Connectivity & Health')
    ).toBeInTheDocument();
  });

  it('renders the architectural specification pillars on the diagnostics page', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <DiagnosticsPage />
      </QueryClientProvider>
    );
    expect(screen.getByText('Taste Discovery Engine')).toBeInTheDocument();
    expect(screen.getByText('Content-Based Scorer')).toBeInTheDocument();
    expect(screen.getByText('MMR & Diversity Caps')).toBeInTheDocument();
  });

  it('renders the API diagnostic console with Zod & React Hook Form on the diagnostics page', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <DiagnosticsPage />
      </QueryClientProvider>
    );
    expect(
      screen.getByText('API Diagnostic Probe Console')
    ).toBeInTheDocument();
    expect(screen.getByText('Execute Endpoint Probe')).toBeInTheDocument();
  });
});
