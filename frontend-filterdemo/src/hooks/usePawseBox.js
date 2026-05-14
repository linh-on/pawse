/**
 * usePawseBox.js — BLE version (manual connect/disconnect)
 *
 * v6 fixes:
 *   - parseStatus no longer early-returns when the closing '}' is missing.
 *     With a 20-byte ATT payload the 21-byte JSON {"s":"L","r":"30:47"}
 *     is truncated to {"s":"L","r":"30:47" (no '}'), which previously hit
 *     the `lastBrace === -1` guard and returned before the regex fallback
 *     could run — so boxState NEVER updated and no sync effect ever fired.
 *     Now the regex fallback always gets a chance to extract state + remaining.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import { BleManager } from "react-native-ble-plx";

// Must match the UUIDs in the ESP32 sketch
const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const STATUS_UUID = "abcd0001-1234-1234-1234-123456789abc";
const COMMAND_UUID = "abcd0002-1234-1234-1234-123456789abc";

const DEVICE_NAME = "PawseBuddy";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSeconds(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

// Singleton BleManager
let manager = null;
function getManager() {
  if (!manager) manager = new BleManager();
  return manager;
}

// ── Map single-char state codes from the ESP32 to full names ──
const STATE_MAP = {
  I: "IDLE",
  L: "LOCKED",
  U: "URGENT",
  R: "RESUME",
  D: "DONE",
};

// ── Android permission helper ────────────────────────────
async function requestAndroidPermissions() {
  if (Platform.OS !== "android") return true;
  const apiLevel = Platform.Version;

  if (apiLevel >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(result).every(
      (v) => v === PermissionsAndroid.RESULTS.GRANTED,
    );
  } else {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
}

// ── Base64 helpers ───────────────────────────────────────
function b64Decode(b64) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  const str = b64.replace(/[^A-Za-z0-9+/]/g, "");
  while (i < str.length) {
    const a = chars.indexOf(str[i++]);
    const b = chars.indexOf(str[i++]);
    const c = chars.indexOf(str[i++]);
    const d = chars.indexOf(str[i++]);
    const triplet = (a << 18) | (b << 12) | (c << 6) | d;
    result += String.fromCharCode((triplet >> 16) & 0xff);
    if (c !== 64) result += String.fromCharCode((triplet >> 8) & 0xff);
    if (d !== 64) result += String.fromCharCode(triplet & 0xff);
  }
  return result;
}

function b64Encode(str) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : NaN;
    const c = i < str.length ? str.charCodeAt(i++) : NaN;
    const triplet = (a << 16) | ((isNaN(b) ? 0 : b) << 8) | (isNaN(c) ? 0 : c);
    result += chars[(triplet >> 18) & 0x3f];
    result += chars[(triplet >> 12) & 0x3f];
    result += isNaN(b) ? "=" : chars[(triplet >> 6) & 0x3f];
    result += isNaN(c) ? "=" : chars[triplet & 0x3f];
  }
  return result;
}

/**
 * usePawseBox() — BLE with manual connect/disconnect
 */
export function usePawseBox() {
  const [connected, setConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [state, setState] = useState(null);
  const [remaining, setRemaining] = useState("00:00");
  const [urgentMsg, setUrgentMsg] = useState("");

  const deviceRef = useRef(null);
  const subRef = useRef(null);
  const cancelledRef = useRef(false);

  // Track consecutive parse failures so we can log once instead of spamming
  const parseFailCount = useRef(0);

  // ── Parse status from ESP32 ───────────────────────────
  // Accepts both short-key (v6) and old long-key (v3/v4) JSON:
  //   Short: {"s":"L","r":"30:47"}
  //   Long:  {"state":"LOCKED","remaining":"30:47","urgentMsg":""}
  //
  // FIX (v6): When the BLE ATT payload is 20 bytes (MTU=23 minus 3 overhead)
  // the 21-byte JSON {"s":"L","r":"30:47"} is delivered truncated as
  // {"s":"L","r":"30:47" (no closing '}'). Previously we returned early when
  // lastBrace === -1, so the regex fallback never ran and boxState froze.
  // Now we skip the early return and let JSON.parse throw, which falls
  // through to the regex path that can still extract "s" and "r" correctly.
  const parseStatus = useCallback((b64Value) => {
    let json;
    try {
      json = b64Decode(b64Value);
    } catch (e) {
      return; // bad base64, skip silently
    }

    // Trim trailing garbage (0xFF padding etc.) by finding last '}'.
    // If no '}' is present (truncated by MTU), keep the raw string so the
    // regex fallback below can still extract state + remaining.
    const lastBrace = json.lastIndexOf("}");
    if (lastBrace !== -1) {
      json = json.substring(0, lastBrace + 1);
    }
    // Do NOT return early here — fall through to JSON.parse which will throw
    // on a truncated string, then the catch block runs the regex fallback.

    let data;
    try {
      if (lastBrace === -1) throw new Error("no closing brace");
      data = JSON.parse(json);
    } catch (e) {
      // JSON was truncated (MTU issue). Try to extract state + remaining
      // with regex so boxState still updates — this is critical for sync
      // between the physical buttons and the phone UI.
      const stateMatch = json.match(/"s"\s*:\s*"([A-Z])"/);
      if (stateMatch) {
        setState(STATE_MAP[stateMatch[1]] ?? stateMatch[1]);
        const remMatch = json.match(/"r"\s*:\s*"(\d+:\d+)"/);
        if (remMatch) setRemaining(remMatch[1]);
        parseFailCount.current = 0;
        return;
      }

      parseFailCount.current += 1;
      if (parseFailCount.current === 1 || parseFailCount.current % 10 === 0) {
        console.warn(
          `BLE status truncated (${parseFailCount.current}x) — ` +
            `got ${json.length} bytes: "${json.substring(0, 30)}…"`,
        );
      }
      return;
    }

    // Successfully parsed — reset failure counter
    parseFailCount.current = 0;

    // Handle short keys (v5/v6 firmware)
    if (data.s !== undefined) {
      setState(STATE_MAP[data.s] ?? data.s);
      setRemaining(data.r ?? "00:00");
      setUrgentMsg(data.u ?? "");
      return;
    }

    // Handle long keys (v3/v4 firmware, backward compat)
    setState(data.state ?? null);
    setRemaining(data.remaining ?? "00:00");
    setUrgentMsg(data.urgentMsg ?? "");
  }, []);

  // ── Write a command to the COMMAND characteristic ─────
  const writeCommand = useCallback(async (cmd) => {
    const device = deviceRef.current;
    if (!device) {
      console.warn("writeCommand: not connected");
      return false;
    }
    try {
      await device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        COMMAND_UUID,
        b64Encode(cmd),
      );
      return true;
    } catch (e) {
      console.warn("writeCommand failed:", e.message ?? e);
      return false;
    }
  }, []);

  // ── Connect (called by user tapping the button) ───────
  const connect = useCallback(async () => {
    if (connected || scanning) return;

    const ble = getManager();
    cancelledRef.current = false;

    const ok = await requestAndroidPermissions();
    if (!ok) {
      console.warn("BLE permissions denied");
      return;
    }

    // Wait for Bluetooth to be powered on
    await new Promise((resolve) => {
      const sub = ble.onStateChange((s) => {
        if (s === "PoweredOn") {
          sub.remove();
          resolve();
        }
      }, true);
    });

    if (cancelledRef.current) return;

    setScanning(true);
    console.log("Scanning for PawseBuddy…");

    ble.startDeviceScan([SERVICE_UUID], null, async (error, device) => {
      if (cancelledRef.current) {
        ble.stopDeviceScan();
        setScanning(false);
        return;
      }
      if (error) {
        console.warn("Scan error:", error);
        setScanning(false);
        return;
      }

      if (device && device.name === DEVICE_NAME) {
        ble.stopDeviceScan();
        setScanning(false);
        console.log("Found PawseBuddy, connecting…");

        try {
          // Connect without requestMTU option — we'll do it explicitly below,
          // which is more reliable on Samsung and other Android devices.
          const d = await device.connect();

          if (cancelledRef.current) {
            d.cancelConnection();
            return;
          }

          // Explicit MTU negotiation. The connect({ requestMTU }) option
          // silently fails on many Android phones (especially Samsung Galaxy).
          // Calling requestMTU() directly is more reliable and lets us await
          // the actual negotiated value.
          if (Platform.OS === "android") {
            try {
              const mtuDevice = await d.requestMTU(512);
              console.log("Negotiated MTU:", mtuDevice.mtu);
            } catch (mtuErr) {
              console.warn(
                "MTU negotiation failed, using default:",
                mtuErr.message,
              );
              // Continue anyway — parseStatus now handles truncated JSON via
              // regex fallback even when MTU stays at the 23-byte default.
            }
          }

          await d.discoverAllServicesAndCharacteristics();

          if (cancelledRef.current) {
            d.cancelConnection();
            return;
          }

          deviceRef.current = d;
          setConnected(true);
          console.log("BLE connected!");

          // Subscribe to STATUS notifications
          subRef.current = d.monitorCharacteristicForService(
            SERVICE_UUID,
            STATUS_UUID,
            (err, char) => {
              if (err) {
                // Don't log every notification error — they're common during
                // disconnect and are handled by the onDisconnected callback.
                return;
              }
              if (char?.value) parseStatus(char.value);
            },
          );

          // Initial read
          try {
            const initial = await d.readCharacteristicForService(
              SERVICE_UUID,
              STATUS_UUID,
            );
            if (initial?.value) parseStatus(initial.value);
          } catch (readErr) {
            console.warn("Initial status read failed:", readErr.message);
          }

          // Handle unexpected disconnection
          d.onDisconnected(() => {
            console.log("BLE disconnected");
            setConnected(false);
            setScanning(false);
            setState(null);
            setRemaining("00:00");
            setUrgentMsg("");
            deviceRef.current = null;
            subRef.current?.remove();
            subRef.current = null;
          });
        } catch (e) {
          console.warn("Connection failed:", e.message ?? e);
          setScanning(false);
          setConnected(false);
        }
      }
    });

    setTimeout(() => {
      if (!deviceRef.current) {
        ble.stopDeviceScan();
        setScanning(false);
        if (!cancelledRef.current) {
          console.log("Scan timed out — PawseBuddy not found");
        }
      }
    }, 15000);
  }, [connected, scanning, parseStatus]);

  // ── Disconnect (called by user tapping the button) ────
  const disconnect = useCallback(async () => {
    cancelledRef.current = true;
    const ble = getManager();
    ble.stopDeviceScan();
    setScanning(false);

    subRef.current?.remove();
    subRef.current = null;

    if (deviceRef.current) {
      try {
        await deviceRef.current.cancelConnection();
      } catch (e) {
        // Already disconnected, that's fine
      }
      deviceRef.current = null;
    }
    setConnected(false);
    setState(null);
    setRemaining("00:00");
    setUrgentMsg("");
  }, []);

  // ── Cleanup on unmount ────────────────────────────────
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      const ble = getManager();
      ble.stopDeviceScan();
      subRef.current?.remove();
      subRef.current = null;
    };
  }, []);

  // ── Actions ───────────────────────────────────────────
  const startSession = useCallback(
    (minutes) => writeCommand(`start:${minutes}`),
    [writeCommand],
  );

  const sendUrgent = useCallback(
    (message) => writeCommand(`urgent:${message}`),
    [writeCommand],
  );

  const respondUrgent = useCallback(
    (yes) => writeCommand(`respond:${yes ? "yes" : "no"}`),
    [writeCommand],
  );

  const pauseSession = useCallback(
    (remainingSeconds) =>
      writeCommand(`pause:${normalizeSeconds(remainingSeconds)}`),
    [writeCommand],
  );

  const syncTimer = useCallback(
    (remainingSeconds) =>
      writeCommand(`sync:${normalizeSeconds(remainingSeconds)}`),
    [writeCommand],
  );

  const endSession = useCallback(() => writeCommand("end"), [writeCommand]);

  const resume = useCallback(
    async (continueSession, remainingSeconds) => {
      if (!continueSession) return endSession();

      if (typeof remainingSeconds === "number") {
        return writeCommand(`resume:yes:${normalizeSeconds(remainingSeconds)}`);
      }

      return writeCommand("resume:yes");
    },
    [endSession, writeCommand],
  );

  return {
    connected,
    scanning,
    connect,
    disconnect,
    state,
    remaining,
    urgentMsg,
    actions: {
      startSession,
      sendUrgent,
      respondUrgent,
      pauseSession,
      syncTimer,
      resume,
      endSession,
    },
  };
}
