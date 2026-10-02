import React from 'react';
import { useSearchParams } from 'react-router-dom';

export type PageViewState = 'populated' | 'loading' | 'empty' | 'error';

export function usePageState(initial: PageViewState = 'populated'): [PageViewState, (state: PageViewState) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramState = searchParams.get('state') as PageViewState | null;
  const [localState, setLocalState] = React.useState<PageViewState>(
    paramState && ['populated', 'loading', 'empty', 'error'].includes(paramState) ? paramState : initial
  );

  const setState = (nextState: PageViewState) => {
    setLocalState(nextState);
    const newParams = new URLSearchParams(searchParams);
    if (nextState === 'populated') {
      newParams.delete('state');
    } else {
      newParams.set('state', nextState);
    }
    setSearchParams(newParams, { replace: true });
  };

  return [localState, setState];
}
