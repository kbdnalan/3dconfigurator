import { useCallback, useEffect, useRef, useState } from 'react';

const TRANSITION_MS = 1500;

export function useTimeOfDay(initial) {
  const [time, setTime] = useState(initial);
  const timeRef = useRef(initial);
  const frameRef = useRef(null);

  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const setTimeNow = useCallback(
    (value) => {
      stop();
      setTime(value);
    },
    [stop],
  );

  const animateTo = useCallback(
    (target) => {
      stop();
      const from = timeRef.current;
      const startedAt = performance.now();

      const step = (now) => {
        const t = Math.min(1, (now - startedAt) / TRANSITION_MS);
        const eased = t * t * (3 - 2 * t);
        setTime(from + (target - from) * eased);
        frameRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      frameRef.current = requestAnimationFrame(step);
    },
    [stop],
  );

  return [time, setTimeNow, animateTo];
}
