import { useState, useCallback } from 'react';

export function useSafeState<T>(initialState: T | (() => T)) {
  const [state, setState] = useState(initialState);

  const safeSetState = useCallback((newState: T | ((prevState: T) => T)) => {
    try {
      setState(newState);
    } catch (error) {
      console.error('Error setting state:', error);
    }
  }, []);

  return [state, safeSetState] as const;
}
