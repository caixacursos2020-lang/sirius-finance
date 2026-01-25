import { useEffect } from "react";

type Options = {
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
};

export function useHotkeys(key: string, callback: () => void, options: Options = {}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchesKey = event.key.toLowerCase() === key.toLowerCase();
      const matchesCtrl = options.ctrlKey ? event.ctrlKey || event.metaKey || options.metaKey : true;
      const matchesMeta = options.metaKey ? event.metaKey : true;
      const matchesShift = options.shiftKey ? event.shiftKey : true;
      const matchesAlt = options.altKey ? event.altKey : true;

      if (matchesKey && matchesCtrl && matchesMeta && matchesShift && matchesAlt) {
        if (options.preventDefault !== false) {
          event.preventDefault();
        }
        callback();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, callback, options.ctrlKey, options.metaKey, options.shiftKey, options.altKey, options.preventDefault]);
}
