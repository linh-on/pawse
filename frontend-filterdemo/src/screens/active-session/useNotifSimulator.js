import { useState, useEffect, useRef } from "react";
import { Animated } from "react-native";
import { tfidfClassify } from "./classifier";
import { NOTIFICATION_POOL } from "./notifications";
import { shuffle } from "./utils";

/**
 * useNotifSimulator
 *
 * Owns all the notification simulation state — pool, feed, modal, auto-fire.
 * Returns the values + handlers the screen needs.
 *
 * onUrgentDetected  – callback fired when an urgent notif appears (e.g. send to box)
 * onUrgentDismiss   – callback fired when modal is dismissed
 */
export function useNotifSimulator({ onUrgentDetected, onUrgentDismiss }) {
  const [feed, setFeed] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [urgentModal, setUrgentModal] = useState(null);
  const [pool, setPool] = useState(() => shuffle(NOTIFICATION_POOL));
  const [poolIndex, setPoolIndex] = useState(0);

  const modalScale = useRef(new Animated.Value(0.85)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const poolRef = useRef(pool);
  const poolIndexRef = useRef(poolIndex);
  const isRunningRef = useRef(false);
  const intervalRef = useRef(null);

  poolRef.current = pool;
  poolIndexRef.current = poolIndex;
  isRunningRef.current = isRunning;

  // Auto-fire interval. Stops when modal is open or paused.
  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => fireNext(), 2800);
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  function fireNext() {
    let idx = poolIndexRef.current;
    let currentPool = poolRef.current;

    if (idx >= currentPool.length) {
      const newPool = shuffle(NOTIFICATION_POOL);
      setPool(newPool);
      poolRef.current = newPool;
      idx = 0;
      setPoolIndex(0);
    }

    const notif = currentPool[idx];
    setPoolIndex(idx + 1);
    poolIndexRef.current = idx + 1;

    const predicted = tfidfClassify(notif.text);
    const entry = {
      id: Date.now(),
      text: notif.text,
      trueLabel: notif.label,
      predicted,
      correct: predicted === notif.label,
    };

    if (predicted === "urgent") {
      showModal(entry);
    } else {
      setFeed((prev) => [entry, ...prev].slice(0, 20));
    }
  }

  function showModal(entry) {
    clearInterval(intervalRef.current);
    setUrgentModal(entry);
    onUrgentDetected?.(entry);

    modalScale.setValue(0.85);
    modalOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 90,
        friction: 10,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function dismissModal() {
    if (isRunningRef.current) {
      intervalRef.current = setInterval(() => fireNext(), 2800);
    }
    onUrgentDismiss?.();

    Animated.timing(modalOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      if (urgentModal) setFeed((prev) => [urgentModal, ...prev].slice(0, 20));
      setUrgentModal(null);
    });
  }

  function clearModal() {
    Animated.timing(modalOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setUrgentModal(null);
    });
  }

  return {
    feed,
    isRunning,
    urgentModal,
    modalScale,
    modalOpacity,
    fireNext,
    togglePlay: () => setIsRunning((v) => !v),
    dismissModal,
    clearModal,
  };
}
