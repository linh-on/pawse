import { useState, useEffect, useRef } from "react";
import {
  Animated,
  NativeModules,
  NativeEventEmitter,
  Platform,
} from "react-native";
import { classifyWithContacts, buildTrustedKeywords } from "./classifier";
import { supabase } from "../../lib/supabase";
import { NOTIFICATION_POOL } from "./notifications";
import { shuffle } from "./utils";

const { PawseNotifModule } = NativeModules;

// Safe emitter — only constructed when the native module is actually present
const notifEmitter =
  PawseNotifModule && Platform.OS === "android"
    ? new NativeEventEmitter(PawseNotifModule)
    : null;

/**
 * useNotifSimulator
 *
 * On Android (with notification access granted):
 *   - Listens to real notifications via PawseNotificationService
 *   - "isRunning" gates whether incoming notifications are processed
 *   - "fireNext" manually injects the next sim notification (for testing)
 *
 * Fallback (iOS / permission denied / native module missing):
 *   - Behaves exactly like the original sim with the NOTIFICATION_POOL
 *
 * API surface is identical to the old hook so no other files need changes.
 */
export function useNotifSimulator({
  onNotificationClassified,
  onUrgentDetected,
  onUrgentDismiss,
  userId,
}) {
  const [feed, setFeed] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [urgentModal, setUrgentModal] = useState(null);
  const [trustedKeywords, setTrustedKeywords] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [mode, setMode] = useState("sim"); // "real" | "sim"

  // Sim pool state (used in sim mode or as manual fireNext)
  const [pool, setPool] = useState(() => shuffle(NOTIFICATION_POOL));
  const [poolIndex, setPoolIndex] = useState(0);

  const modalScale = useRef(new Animated.Value(0.85)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  // Refs so callbacks always see latest values without re-registering listeners
  const trustedKeywordsRef = useRef([]);
  const isRunningRef = useRef(false);
  const poolRef = useRef(pool);
  const poolIndexRef = useRef(poolIndex);
  const intervalRef = useRef(null);
  const urgentModalRef = useRef(null);

  trustedKeywordsRef.current = trustedKeywords;
  isRunningRef.current = isRunning;
  poolRef.current = pool;
  poolIndexRef.current = poolIndex;
  urgentModalRef.current = urgentModal;

  // ── Fetch trusted contacts ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchContacts() {
      if (!userId) return;
      const { data, error } = await supabase
        .from("trusted_contacts")
        .select("name, note")
        .eq("user_id", userId);
      if (!error && data) setTrustedKeywords(buildTrustedKeywords(data));
    }
    fetchContacts();
  }, [userId]);

  // ── Check Android notification permission ───────────────────────────────
  useEffect(() => {
    if (!PawseNotifModule || Platform.OS !== "android") return;

    PawseNotifModule.hasPermission().then((granted) => {
      setHasPermission(granted);
      setMode(granted ? "real" : "sim");
    });
  }, []);

  // ── Listen to real notifications (Android + permission granted) ─────────
  useEffect(() => {
    if (mode !== "real" || !notifEmitter) return;

    const sub = notifEmitter.addListener("PawseNotification", (event) => {
      // Only process notifications when session is running
      if (!isRunningRef.current) return;

      const text = event.text || "";
      if (!text.trim()) return;

      handleIncoming(text, null); // no trueLabel for real notifs
    });

    return () => sub.remove();
  }, [mode]);

  // ── Sim auto-fire interval (sim mode only) ──────────────────────────────
  useEffect(() => {
    if (mode !== "sim") return;

    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => fireNext(), 2800);
    return () => clearInterval(intervalRef.current);
  }, [isRunning, mode]);

  // ── Core: classify + route a notification ───────────────────────────────
  function handleIncoming(text, trueLabel) {
    const predicted = classifyWithContacts(text, trustedKeywordsRef.current);
    const isTrusted = trustedKeywordsRef.current.some((kw) =>
      text.toLowerCase().includes(kw),
    );

    const entry = {
      id: Date.now() + Math.random(),
      text,
      trueLabel, // null for real notifications
      predicted,
      correct: trueLabel ? predicted === trueLabel : null,
      isTrusted,
    };

    onNotificationClassified?.(entry);

    if (predicted === "urgent") {
      showModal(entry);
    } else {
      setFeed((prev) => [entry, ...prev].slice(0, 20));
    }
  }

  // ── Manual fire (injects next sim notification regardless of mode) ───────
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

    handleIncoming(notif.text, notif.label);
  }

  // ── Modal helpers ────────────────────────────────────────────────────────
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
    if (isRunningRef.current && mode === "sim") {
      intervalRef.current = setInterval(() => fireNext(), 2800);
    }
    onUrgentDismiss?.();

    Animated.timing(modalOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      if (urgentModalRef.current) {
        setFeed((prev) => [urgentModalRef.current, ...prev].slice(0, 20));
      }
      setUrgentModal(null);
    });
  }

  function clearModal() {
    Animated.timing(modalOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setUrgentModal(null));
  }

  // ── Request permission helper (call from UI) ─────────────────────────────
  async function requestPermission() {
    if (!PawseNotifModule) return;
    await PawseNotifModule.openSettings();
    // Re-check after user returns from settings
    const granted = await PawseNotifModule.hasPermission();
    setHasPermission(granted);
    setMode(granted ? "real" : "sim");
  }

  return {
    feed,
    isRunning,
    urgentModal,
    modalScale,
    modalOpacity,
    // Mode info for UI
    mode, // "real" | "sim"
    hasPermission,
    // Actions
    fireNext,
    togglePlay: () => setIsRunning((v) => !v),
    dismissModal,
    clearModal,
    requestPermission,
  };
}
