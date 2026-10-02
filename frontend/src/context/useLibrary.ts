import { useContext } from 'react';
import { LibraryContext, type LibraryContextValue } from './LibraryContext';

export const useLibrary = (): LibraryContextValue => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};

export const useLibraryOptional = (): LibraryContextValue | null => {
  const context = useContext(LibraryContext);
  return context ?? null;
};
