import { useCallback, useEffect, useState } from 'react';
import { fetchAlerts, fetchHistory, fetchLatestInsight } from '../services/api';
import { useHealthStore } from '../store';

export function useHealthData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setHistory = useHealthStore((state) => state.setHistory);
  const setAlerts = useHealthStore((state) => state.setAlerts);
  const setInsight = useHealthStore((state) => state.setInsight);
  const setConnectionState = useHealthStore((state) => state.setConnectionState);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [history, alerts, insight] = await Promise.all([
        fetchHistory(),
        fetchAlerts(),
        fetchLatestInsight(),
      ]);
      setHistory(history);
      setAlerts(alerts);
      setInsight(insight);
      setConnectionState('live');
      setError(null);
    } catch {
      setConnectionState('offline');
      setError('Could not load live vitals.');
    } finally {
      setLoading(false);
    }
  }, [setAlerts, setConnectionState, setHistory, setInsight]);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 1000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { loading, error, refreshInsight: refresh };
}
