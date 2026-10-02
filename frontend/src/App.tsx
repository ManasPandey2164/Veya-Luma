import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/ui/AppShell';

import { DiscoverPage } from './pages/DiscoverPage';
import { SearchPage } from './pages/SearchPage';
import { TasteDiscoveryPage } from './pages/TasteDiscoveryPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { LibraryPage } from './pages/LibraryPage';
import { MovieDetailPage } from './pages/MovieDetailPage';
import { PreferencesPage } from './pages/PreferencesPage';
import { ProfilePage } from './pages/ProfilePage';
import { AccountPage } from './pages/AccountPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { NotFoundPage } from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppShell>
          <Routes>
            {/* Primary Destinations */}
            <Route path="/" element={<DiscoverPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/taste-discovery" element={<TasteDiscoveryPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />

            {/* Movie Detail Dossier */}
            <Route path="/movies/:movieId" element={<MovieDetailPage />} />

            {/* Library Routes */}
            <Route path="/library" element={<Navigate to="/library/watchlist" replace />} />
            <Route path="/library/watchlist" element={<LibraryPage />} />
            <Route path="/library/favourites" element={<LibraryPage />} />
            <Route path="/library/history" element={<LibraryPage />} />

            {/* Preferences Routes */}
            <Route path="/preferences" element={<Navigate to="/preferences/taste" replace />} />
            <Route path="/preferences/taste" element={<PreferencesPage />} />
            <Route path="/preferences/recommendations" element={<PreferencesPage />} />

            {/* User Profile & Account */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/account" element={<AccountPage />} />

            {/* Developer Diagnostics Probes */}
            <Route path="/diagnostics" element={<DiagnosticsPage />} />

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
