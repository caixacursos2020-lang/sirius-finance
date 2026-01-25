import { useEffect, useState } from "react";

/**
 * Pequeno helper para sincronizar estado com localStorage.
 * Usa JSON.stringify/parse e protege contra SSR/indisponibilidade do window.
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      /* ignore */
    }
    return defaultValue;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [key, state]);

  const update = (value: T | ((prev: T) => T)) => {
    setState((prev) => (value instanceof Function ? value(prev) : value));
  };

  return [state, update];
}

