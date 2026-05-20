import { useState, useRef, useCallback } from 'react';

export default function usePullToRefresh(onRefresh) {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop === 0) startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    // Prevent native scroll only when pulling down significantly
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 10) e.preventDefault();
  }, []);

  const onTouchEnd = useCallback(async (e) => {
    if (startY.current === null) return;
    const delta = e.changedTouches[0].clientY - startY.current;
    startY.current = null;
    if (delta > 70 && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  }, [onRefresh, refreshing]);

  return { containerRef, refreshing, onTouchStart, onTouchMove, onTouchEnd };
}