import { useContext } from 'react';
import { PreferencesContext, type PreferencesContextValue } from './PreferencesContext';

export const usePreferences = (): PreferencesContextValue => {
  const context = useContext(PreferencesContext);
  return context;
};
