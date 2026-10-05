import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_HISTORY_ITEMS = 8;
const STORAGE_PREFIX = '@search_history_';

type Listener = (history: string[]) => void;
const listenersByScope = new Map<string, Set<Listener>>();
const cacheByScope = new Map<string, string[]>();

function getStorageKey(scope: string): string {
  return `${STORAGE_PREFIX}${scope.trim().toLowerCase()}`;
}

function notifyListeners(scope: string, history: string[]): void {
  cacheByScope.set(scope, history);
  const listeners = listenersByScope.get(scope);
  if (listeners) {
    listeners.forEach((fn) => {
      try {
        fn(history);
      } catch {
        // ignore subscriber errors
      }
    });
  }
}

/** Retrieve search history for a scope (from memory cache or AsyncStorage). */
export async function getSearchHistory(scope: string): Promise<string[]> {
  const cached = cacheByScope.get(scope);
  if (cached) return cached;

  try {
    const raw = await AsyncStorage.getItem(getStorageKey(scope));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        cacheByScope.set(scope, parsed);
        return parsed;
      }
    }
  } catch {
    // fallback to empty
  }
  cacheByScope.set(scope, []);
  return [];
}

/** Add a search query to history for a scope. Returns the updated array. */
export async function addSearchQuery(scope: string, query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return getSearchHistory(scope);
  }

  const current = await getSearchHistory(scope);
  // Remove existing match case-insensitively
  const filtered = current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  // Prepend new item and cap at MAX_HISTORY_ITEMS
  const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS);

  try {
    await AsyncStorage.setItem(getStorageKey(scope), JSON.stringify(updated));
  } catch {
    // ignore write error
  }

  notifyListeners(scope, updated);
  return updated;
}

/** Remove a single query from history for a scope. */
export async function removeSearchQuery(scope: string, query: string): Promise<string[]> {
  const trimmed = query.trim();
  const current = await getSearchHistory(scope);
  const updated = current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());

  try {
    await AsyncStorage.setItem(getStorageKey(scope), JSON.stringify(updated));
  } catch {
    // ignore write error
  }

  notifyListeners(scope, updated);
  return updated;
}

/** Clear all search history for a scope. */
export async function clearSearchHistory(scope: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(getStorageKey(scope));
  } catch {
    // ignore removal error
  }
  notifyListeners(scope, []);
}

/**
 * Hook to subscribe to and manage recent search queries for a given scope.
 * Automatically synchronizes across components using the same scope.
 */
export function useSearchHistory(scope: string) {
  const [history, setHistory] = useState<string[]>(() => cacheByScope.get(scope) || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Register listener
    if (!listenersByScope.has(scope)) {
      listenersByScope.set(scope, new Set());
    }
    const listenerSet = listenersByScope.get(scope)!;

    const handler: Listener = (newHistory) => {
      if (isMounted) setHistory(newHistory);
    };
    listenerSet.add(handler);

    // Initial load
    getSearchHistory(scope).then((data) => {
      if (isMounted) {
        setHistory(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      listenerSet.delete(handler);
      if (listenerSet.size === 0) {
        listenersByScope.delete(scope);
      }
    };
  }, [scope]);

  const addQuery = useCallback(
    (query: string) => addSearchQuery(scope, query),
    [scope]
  );

  const removeQuery = useCallback(
    (query: string) => removeSearchQuery(scope, query),
    [scope]
  );

  const clearHistory = useCallback(
    () => clearSearchHistory(scope),
    [scope]
  );

  return {
    history,
    addQuery,
    removeQuery,
    clearHistory,
    loading,
  };
}
