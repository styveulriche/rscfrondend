import { useCallback, useEffect, useRef, useState } from 'react';

export function useRealtimeResource(key, fetcher, options = {}) {
  const {
    interval = 30000,
    enabled = true,
    immediate = true,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled && immediate));
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const mountedRef = useRef(false);
  const keyRef = useRef(key);

  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  const runFetch = useCallback(async () => {
    if (!enabled || typeof fetcher !== 'function') {
      return null;
    }

    setLoading(true);

    try {
      const result = await fetcher();
      if (!mountedRef.current) {
        return null;
      }

      setData(result);
      setError(null);
      setLastUpdated(Date.now());
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        if (typeof onError === 'function') {
          onError(err);
        }
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, fetcher, onError]);

  useEffect(() => {
    mountedRef.current = true;

    if (enabled && immediate) {
      runFetch();
    }

    if (!enabled || interval <= 0) {
      return () => {
        mountedRef.current = false;
      };
    }

    const timer = setInterval(() => {
      runFetch();
    }, interval);

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [enabled, immediate, interval, runFetch]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: runFetch,
    key: keyRef.current,
  };
}
