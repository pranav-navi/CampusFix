import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader and tracks { data, loading, error }.
 * Re-runs whenever `deps` change; call reload() to refetch on demand.
 */
export default function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const callId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++callId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (id === callId.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (id === callId.current) setState((s) => ({ ...s, loading: false, error }));
      return null;
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload, setData: (data) => setState((s) => ({ ...s, data })) };
}
