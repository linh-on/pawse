import { useState, useEffect, useRef, useCallback } from "react";

// IP of the ESP32 when phone is connected to the "PawseBuddy" WiFi AP
const ESP32_BASE = "http://192.168.4.1";
const TIMEOUT_MS = 3000;

// Helper: fetch with timeout so a missing ESP32 doesn't hang forever
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

/**
 * usePawseBox()
 *
 * Returns:
 *   connected:  boolean — last status check succeeded
 *   state:      'IDLE' | 'LOCKED' | 'URGENT' | 'RESUME' | 'DONE' | null
 *   remaining:  string  — formatted MM:SS from box (e.g. "12:34")
 *   urgentMsg:  string  — last urgent message sent
 *   actions: {
 *     startSession(minutes),
 *     sendUrgent(message),
 *     respondUrgent(yes),       // true = unlock now, false = stay locked
 *     resume(continueSession),  // true = resume timer, false = end session
 *   }
 */
export function usePawseBox({ pollMs = 2000 } = {}) {
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState(null);
  const [remaining, setRemaining] = useState("00:00");
  const [urgentMsg, setUrgentMsg] = useState("");
  const pollRef = useRef(null);

  // Poll /status every pollMs
  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const res = await fetchWithTimeout(`${ESP32_BASE}/status`);
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        if (cancelled) return;
        setConnected(true);
        setState(data.state ?? null);
        setRemaining(data.remaining ?? "00:00");
        setUrgentMsg(data.urgentMsg ?? "");
      } catch {
        if (!cancelled) setConnected(false);
      }
    };

    checkStatus();
    pollRef.current = setInterval(checkStatus, pollMs);
    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [pollMs]);

  // POST /start with minutes
  const startSession = useCallback(async (minutes) => {
    try {
      await fetchWithTimeout(`${ESP32_BASE}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `minutes=${minutes}`,
      });
      return true;
    } catch (e) {
      console.warn("startSession failed:", e);
      return false;
    }
  }, []);

  // POST /urgent with msg
  const sendUrgent = useCallback(async (message) => {
    try {
      await fetchWithTimeout(`${ESP32_BASE}/urgent`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `msg=${encodeURIComponent(message)}`,
      });
      return true;
    } catch (e) {
      console.warn("sendUrgent failed:", e);
      return false;
    }
  }, []);

  // POST /respond with choice=yes/no
  // yes = unlock now, no = ignore and stay locked
  const respondUrgent = useCallback(async (yes) => {
    try {
      await fetchWithTimeout(`${ESP32_BASE}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `choice=${yes ? "yes" : "no"}`,
      });
      return true;
    } catch (e) {
      console.warn("respondUrgent failed:", e);
      return false;
    }
  }, []);

  // POST /resume with choice=yes/no
  // yes = resume timer, no = end session
  const resume = useCallback(async (continueSession) => {
    try {
      await fetchWithTimeout(`${ESP32_BASE}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `choice=${continueSession ? "yes" : "no"}`,
      });
      return true;
    } catch (e) {
      console.warn("resume failed:", e);
      return false;
    }
  }, []);

  return {
    connected,
    state,
    remaining,
    urgentMsg,
    actions: { startSession, sendUrgent, respondUrgent, resume },
  };
}
