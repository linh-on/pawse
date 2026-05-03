import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Animated,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import CircularProgress from "../components/CircularProgress";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import {
  colors,
  spacing,
  radii,
  shadows,
  typography,
  patterns,
  tint,
} from "../theme";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const genCode = (len = 6) =>
  Math.random()
    .toString(36)
    .toUpperCase()
    .slice(2, 2 + len);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const STATUS_COLOR = {
  present: colors.success,
  late: colors.orange,
  absent: colors.error,
};
const STATUS_ICON = {
  present: "check-circle",
  late: "watch-later",
  absent: "cancel",
};

const fmt = (totalSecs) => {
  const s = Math.max(0, totalSecs);
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

const calcRemaining = (startedAt, durationMinutes) => {
  if (!startedAt || !durationMinutes) return 0;
  const endMs = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
  return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
};

// ─── Student Lock Screen ───────────────────────────────────────────────────────
// Full-screen takeover shown when school mode is active.
// Shows a countdown timer + single Override button — nothing else.

const StudentLockScreen = ({ classInfo, session, onOverride }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const totalSecs = (session?.duration_minutes ?? 0) * 60;
  const [remaining, setRemaining] = useState(() =>
    calcRemaining(session?.started_at, session?.duration_minutes),
  );

  // Countdown tick
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(
        calcRemaining(session?.started_at, session?.duration_minutes),
      );
    }, 1000);
    return () => clearInterval(id);
  }, [session?.started_at, session?.duration_minutes]);

  // Glow pulse (same as ActiveSession)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 2400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 2400,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const progress = totalSecs > 0 ? remaining / totalSecs : 0;

  const handleOverride = () => {
    Alert.alert(
      "Emergency Override",
      "School Mode will turn off and your teacher will be notified. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Override",
          style: "destructive",
          onPress: async () => {
            // Log override in class_session_members
            if (session?.id) {
              await supabase
                .from("class_session_members")
                .update({
                  override_at: new Date().toISOString(),
                  left_at: new Date().toISOString(),
                })
                .eq("session_id", session.id)
                .eq("student_id", user.id);
            }
            // Legacy override_log
            await supabase.from("override_log").insert({
              student_id: user.id,
              class_id: classInfo?.id ?? null,
              session_id: session?.id ?? null,
              overrode_at: new Date().toISOString(),
            });
            await supabase
              .from("school_mode")
              .update({ is_on: false, locked: false, session_id: null })
              .eq("student_id", user.id);
            onOverride();
          },
        },
      ],
    );
  };

  return (
    <View
      style={[
        lockStyles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={lockStyles.header}>
        <Text style={lockStyles.className}>{classInfo?.name ?? "Class"}</Text>
        <Text style={lockStyles.modeLabel}>SCHOOL MODE</Text>
      </View>

      {/* Circular timer */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <CircularProgress
          size={280}
          strokeWidth={10}
          progress={progress}
          trackColor={`${colors.orange}22`}
          fillColor={colors.orange}
        >
          <View style={lockStyles.timerFace}>
            <MaterialIcons
              name="lock"
              size={28}
              color={colors.orange}
              style={{ marginBottom: 6 }}
            />
            <Text style={lockStyles.timerText}>{fmt(remaining)}</Text>
            <Text style={lockStyles.timerSub}>remaining</Text>
          </View>
        </CircularProgress>
      </Animated.View>

      <Text style={lockStyles.hint}>Stay focused 📚</Text>

      {/* Override — small, at the bottom, same pattern as ActiveSession */}
      <TouchableOpacity
        style={lockStyles.overrideBtn}
        onPress={handleOverride}
        activeOpacity={0.75}
      >
        <View style={lockStyles.overrideCircle}>
          <MaterialIcons name="emergency" size={22} color={colors.outline} />
        </View>
        <Text style={lockStyles.overrideCaption}>In case of emergency</Text>
        <Text style={lockStyles.overrideLink}>Override</Text>
      </TouchableOpacity>
    </View>
  );
};

const lockStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.onPrimaryFixed,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.containerPadding,
  },
  header: { alignItems: "center", gap: 6, paddingTop: spacing.lg },
  className: {
    ...typography.h2,
    color: colors.primaryFixedDim,
    textAlign: "center",
  },
  modeLabel: {
    ...typography.labelCaps,
    color: colors.orange,
    letterSpacing: 2,
    fontSize: 11,
  },
  timerFace: {
    width: 232,
    height: 232,
    borderRadius: 116,
    backgroundColor: `${colors.onPrimaryFixed}CC`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${colors.orange}22`,
    ...shadows.timer,
  },
  timerText: { ...typography.timerDisplay, color: colors.primaryFixedDim },
  timerSub: {
    ...typography.labelCaps,
    color: `${colors.primaryFixedDim}88`,
    marginTop: 6,
  },
  hint: {
    ...typography.bodyMd,
    color: `${colors.primaryFixedDim}66`,
    textAlign: "center",
  },
  overrideBtn: { alignItems: "center", gap: 6, paddingBottom: spacing.md },
  overrideCircle: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: `${colors.outline}18`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: `${colors.outline}30`,
  },
  overrideCaption: {
    ...typography.labelCaps,
    color: `${colors.primaryFixedDim}55`,
    fontSize: 9,
  },
  overrideLink: {
    ...typography.bodySm,
    color: `${colors.primaryFixedDim}88`,
    fontWeight: "700",
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
  },
});

// ─── Student View ─────────────────────────────────────────────────────────────

const StudentView = () => {
  const { user } = useAuth();

  const [view, setView] = useState("list"); // "list" | "detail"
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [attendance, setAttendance] = useState([]);

  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // School mode state
  const [schoolModeOn, setSchoolModeOn] = useState(false);
  const [activeSession, setActiveSession] = useState(null); // class_sessions row

  // Session code entry
  const [sessionModal, setSessionModal] = useState(false);
  const [sessionCodeInput, setSessionCodeInput] = useState("");

  const loadAll = useCallback(() => {
    async function run() {
      if (!user?.id) return;
      // Load joined classes
      const { data: members } = await supabase
        .from("class_members")
        .select(
          "class_id, classes(id, name, join_code, session_active, session_started_at)",
        )
        .eq("student_id", user.id);
      if (members) setClasses(members.map((m) => m.classes).filter(Boolean));

      // Load school mode + active session
      const { data: sm } = await supabase
        .from("school_mode")
        .select("is_on, locked, class_id, session_id")
        .eq("student_id", user.id)
        .maybeSingle();

      if (sm?.is_on && sm?.session_id) {
        setSchoolModeOn(true);
        // Load session details for the timer
        const { data: sess } = await supabase
          .from("class_sessions")
          .select(
            "id, class_id, duration_minutes, started_at, session_code, active",
          )
          .eq("id", sm.session_id)
          .maybeSingle();
        if (sess?.active) {
          activeSessionRef.current = sess;
          setActiveSession(sess);
        } else {
          // Session ended — release
          await supabase
            .from("school_mode")
            .update({ is_on: false, locked: false, session_id: null })
            .eq("student_id", user.id);
          setSchoolModeOn(false);
          setActiveSession(null);
        }
      } else {
        setSchoolModeOn(false);
        setActiveSession(null);
      }
    }
    run();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      // Poll every 5s to catch session end, timer sync
      const id = setInterval(loadAll, 5000);
      return () => clearInterval(id);
    }, [loadAll]),
  );

  const openClass = async (cls) => {
    setSelected(cls);
    setView("detail");
    const { data: att } = await supabase
      .from("attendance")
      .select("date, status")
      .eq("student_id", user.id)
      .eq("class_id", cls.id)
      .order("date", { ascending: false })
      .limit(10);
    if (att) setAttendance(att);
  };

  const joinClass = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    const { data: cls, error } = await supabase
      .from("classes")
      .select("id, name")
      .eq("join_code", joinCode.trim().toUpperCase())
      .maybeSingle();
    if (error || !cls) {
      Alert.alert("Not found", "Check the class code with your teacher.");
      setJoinLoading(false);
      return;
    }
    await supabase
      .from("class_members")
      .upsert(
        { class_id: cls.id, student_id: user.id },
        { onConflict: "class_id,student_id" },
      );
    setJoinCode("");
    setShowJoin(false);
    setJoinLoading(false);
    loadAll();
    Alert.alert("Joined!", `You're now in ${cls.name}.`);
  };

  const handleTurnOn = () => {
    if (!selected?.session_active) {
      Alert.alert(
        "No active session",
        "Your teacher hasn't started a session yet.",
      );
      return;
    }
    setSessionModal(true);
  };

  const confirmSessionCode = async () => {
    const code = sessionCodeInput.trim().toUpperCase();
    if (!code) return;

    // Find the active class_sessions row
    const { data: sess } = await supabase
      .from("class_sessions")
      .select("id, duration_minutes, started_at, session_code")
      .eq("class_id", selected.id)
      .eq("active", true)
      .maybeSingle();

    if (!sess || sess.session_code !== code) {
      Alert.alert("Wrong code", "Check with your teacher and try again.");
      return;
    }

    // Insert into class_session_members
    await supabase.from("class_session_members").upsert(
      {
        session_id: sess.id,
        class_id: selected.id,
        student_id: user.id,
        joined_at: new Date().toISOString(),
      },
      { onConflict: "session_id,student_id" },
    );

    // Update school_mode
    await supabase.from("school_mode").upsert(
      {
        student_id: user.id,
        is_on: true,
        locked: true,
        class_id: selected.id,
        session_id: sess.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    );

    activeSessionRef.current = sess;
    setActiveSession(sess);
    setSchoolModeOn(true);
    setSessionModal(false);
    setSessionCodeInput("");
  };

  const handleOverride = () => {
    setSchoolModeOn(false);
    setActiveSession(null);
  };

  // If school mode is on — show lock screen instead of normal UI
  if (schoolModeOn && activeSession) {
    // Find the class for classInfo
    const classInfo =
      classes.find((c) => c.id === activeSession.class_id) ?? selected;
    return (
      <StudentLockScreen
        classInfo={classInfo}
        session={activeSession}
        onOverride={handleOverride}
      />
    );
  }

  // ── List view ──
  if (view === "list") {
    return (
      <>
        {/* Join class */}
        <TouchableOpacity
          style={[patterns.card, shadows.card, styles.section]}
          onPress={() => setShowJoin((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={styles.headRow}>
            <View
              style={[
                styles.chip,
                { backgroundColor: tint(colors.primary, 0.12) },
              ]}
            >
              <MaterialIcons name="add" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Join a Class</Text>
            <MaterialIcons
              name={showJoin ? "expand-less" : "expand-more"}
              size={20}
              color={colors.outline}
            />
          </View>
          {showJoin && (
            <View style={[styles.inputRow, { marginTop: spacing.sm }]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
                placeholder="e.g. SCIENCE2026-TOM"
                placeholderTextColor={colors.outlineVariant}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={joinClass}
                disabled={joinLoading}
              >
                {joinLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Join</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {classes.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons
              name="school"
              size={40}
              color={colors.outlineVariant}
            />
            <Text style={styles.emptyText}>
              No classes yet. Join one above.
            </Text>
          </View>
        ) : (
          classes.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={[patterns.card, shadows.card, styles.section]}
              onPress={() => openClass(cls)}
              activeOpacity={0.8}
            >
              <View style={styles.headRow}>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: tint(colors.primary, 0.1) },
                  ]}
                >
                  <MaterialIcons
                    name="class"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{cls.name}</Text>
                  <Text style={styles.hint}>{cls.join_code}</Text>
                </View>
                <LivePill active={cls.session_active} />
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={colors.outline}
                />
              </View>
            </TouchableOpacity>
          ))
        )}
      </>
    );
  }

  // ── Detail view ──
  return (
    <>
      <TouchableOpacity style={styles.backRow} onPress={() => setView("list")}>
        <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>All classes</Text>
      </TouchableOpacity>

      {/* Class card + turn on school mode */}
      <View style={[patterns.card, shadows.card, styles.section]}>
        <View style={styles.headRow}>
          <View
            style={[
              styles.chip,
              { backgroundColor: tint(colors.primary, 0.1) },
            ]}
          >
            <MaterialIcons name="class" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{selected?.name}</Text>
            <Text style={styles.hint}>{selected?.join_code}</Text>
          </View>
          <LivePill active={selected?.session_active} />
        </View>

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            !selected?.session_active && { opacity: 0.35 },
          ]}
          onPress={handleTurnOn}
          disabled={!selected?.session_active}
        >
          <MaterialIcons
            name="lock"
            size={18}
            color={colors.onPrimaryContainer}
          />
          <Text style={styles.primaryBtnText}>Turn on School Mode</Text>
        </TouchableOpacity>

        {!selected?.session_active && (
          <Text style={[styles.hint, { textAlign: "center" }]}>
            Waiting for your teacher to start a session.
          </Text>
        )}
      </View>

      {/* Attendance */}
      <View style={[patterns.card, shadows.card, styles.section]}>
        <View style={styles.headRow}>
          <View
            style={[
              styles.chip,
              { backgroundColor: tint(colors.primary, 0.1) },
            ]}
          >
            <MaterialIcons
              name="event-available"
              size={18}
              color={colors.primary}
            />
          </View>
          <Text style={styles.cardTitle}>My Attendance</Text>
        </View>
        {attendance.length === 0 ? (
          <Text style={styles.hint}>No records yet for this class.</Text>
        ) : (
          attendance.map((a, i) => (
            <View key={i} style={styles.recordRow}>
              <Text style={styles.label}>
                {new Date(a.date + "T00:00:00").toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
              <StatusPill status={a.status} />
            </View>
          ))
        )}
      </View>

      {/* Session code modal */}
      <Modal visible={sessionModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Enter Session Code</Text>
            <Text style={styles.hint}>
              Your teacher will tell you this at the start of class.
            </Text>
            <TextInput
              style={styles.codeInput}
              value={sessionCodeInput}
              onChangeText={(t) => setSessionCodeInput(t.toUpperCase())}
              placeholder="Enter code"
              placeholderTextColor={colors.outlineVariant}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { flex: 1 }]}
                onPress={() => {
                  setSessionModal(false);
                  setSessionCodeInput("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1 }]}
                onPress={confirmSessionCode}
              >
                <Text style={styles.actionBtnText}>Turn On</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ─── Teacher View ─────────────────────────────────────────────────────────────

const TeacherView = () => {
  const { user } = useAuth();

  const [view, setView] = useState("list");
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeSession, setActiveSession] = useState(null); // class_sessions row

  // Roster: enrolled in class vs joined session
  const [enrolled, setEnrolled] = useState([]); // class_members
  const [sessionMembers, setSessionMembers] = useState([]); // class_session_members
  const [overrides, setOverrides] = useState([]);

  // Create class
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newJoinCode, setNewJoinCode] = useState("");
  const [creating, setCreating] = useState(false);

  // Start session modal
  const [sessionModal, setSessionModal] = useState(false);
  const [sessionCodeInput, setSessionCodeInput] = useState("");
  const [durationInput, setDurationInput] = useState("45");
  const [startingSession, setStartingSession] = useState(false);

  const pollRef = useRef(null);
  const activeSessionRef = useRef(null); // always current session for poll closure

  const loadClasses = useCallback(() => {
    async function run() {
      if (!user?.id) return;
      const { data } = await supabase
        .from("classes")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setClasses(data);
    }
    run();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadClasses();
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [loadClasses]),
  );

  // Takes IDs (not objects) so it never closes over stale references
  const loadRoster = useCallback(async (classId, sessionId) => {
    if (!classId) return;

    // Everyone enrolled in the class
    const { data: members } = await supabase
      .from("class_members")
      .select(
        "student_id, users!class_members_student_id_fkey(id, name, email)",
      )
      .eq("class_id", classId);
    if (members) setEnrolled(members);

    // Who has joined the active session
    if (sessionId) {
      const { data: sm } = await supabase
        .from("class_session_members")
        .select(
          "student_id, joined_at, override_at, left_at, users!class_session_members_student_id_fkey(id, name)",
        )
        .eq("session_id", sessionId);
      if (sm) setSessionMembers(sm);

      // Override log — real data from DB
      const { data: logs } = await supabase
        .from("override_log")
        .select(
          "id, student_id, overrode_at, rejoined_at, users!override_log_student_id_fkey(name)",
        )
        .eq("session_id", sessionId)
        .order("overrode_at", { ascending: false });
      if (logs) setOverrides(logs);
    } else {
      setSessionMembers([]);
      setOverrides([]);
    }
  }, []);

  const openClass = async (cls) => {
    setSelected(cls);
    setView("detail");

    // Load active session if any
    const { data: sess } = await supabase
      .from("class_sessions")
      .select("id, session_code, duration_minutes, started_at, active")
      .eq("class_id", cls.id)
      .eq("active", true)
      .maybeSingle();

    setActiveSession(sess ?? null);
    await loadRoster(cls.id, sess?.id ?? null);

    // Poll roster every 5s for real-time feel
    activeSessionRef.current = sess ?? null;
    if (pollRef.current) clearInterval(pollRef.current);
    const clsId = cls.id;
    pollRef.current = setInterval(
      () => loadRoster(clsId, activeSessionRef.current?.id ?? null),
      5000,
    );
  };

  const createClass = async () => {
    if (!newName.trim() || !newJoinCode.trim()) {
      Alert.alert("Fill in both fields.");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("classes").insert({
      teacher_id: user.id,
      name: newName.trim(),
      join_code: newJoinCode.trim().toUpperCase(),
      session_active: false,
    });
    setCreating(false);
    if (error) {
      Alert.alert(
        "Error",
        error.code === "23505" ? "That join code is taken." : error.message,
      );
      return;
    }
    setNewName("");
    setNewJoinCode("");
    setShowCreate(false);
    loadClasses();
  };

  const startSession = async () => {
    const code = sessionCodeInput.trim().toUpperCase();
    const dur = parseInt(durationInput, 10);
    if (!code) {
      Alert.alert("Enter a session code.");
      return;
    }
    if (!dur || dur < 1) {
      Alert.alert("Enter a valid duration.");
      return;
    }

    setStartingSession(true);
    const startedAt = new Date().toISOString();

    // Insert class_sessions row
    const { data: sess, error } = await supabase
      .from("class_sessions")
      .insert({
        class_id: selected.id,
        teacher_id: user.id,
        session_code: code,
        duration_minutes: dur,
        started_at: startedAt,
        active: true,
      })
      .select()
      .single();

    if (error) {
      Alert.alert("Error", error.message);
      setStartingSession(false);
      return;
    }

    // Update classes quick-status
    await supabase
      .from("classes")
      .update({
        session_code: code,
        session_active: true,
        session_started_at: startedAt,
      })
      .eq("id", selected.id);

    activeSessionRef.current = sess;
    setActiveSession(sess);
    setSelected((s) => ({ ...s, session_active: true }));
    setStartingSession(false);
    setSessionModal(false);
    setSessionCodeInput("");
    setDurationInput("45");

    // Store session in ref so the poll closure always reads the latest
    activeSessionRef.current = sess;

    // Start polling roster with IDs — no stale closure risk
    if (pollRef.current) clearInterval(pollRef.current);
    const classId = selected.id;
    pollRef.current = setInterval(
      () => loadRoster(classId, activeSessionRef.current?.id ?? null),
      5000,
    );
    loadRoster(classId, sess.id);
  };

  const endSession = async () => {
    if (!activeSession) return;

    await supabase
      .from("class_sessions")
      .update({ active: false, ended_at: new Date().toISOString() })
      .eq("id", activeSession.id);

    await supabase
      .from("classes")
      .update({
        session_active: false,
        session_code: null,
        session_started_at: null,
      })
      .eq("id", selected.id);

    // Release all students
    await supabase
      .from("school_mode")
      .update({ is_on: false, locked: false, session_id: null })
      .eq("class_id", selected.id);

    activeSessionRef.current = null;
    setActiveSession(null);
    setSelected((s) => ({ ...s, session_active: false }));
    setSessionMembers([]);
    setOverrides([]);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const markAttendance = async (studentId, status) => {
    await supabase.from("attendance").upsert(
      {
        class_id: selected.id,
        student_id: studentId,
        date: new Date().toISOString().slice(0, 10),
        status,
        marked_by: user.id,
      },
      { onConflict: "class_id,student_id,date" },
    );
  };

  // ── List view ──
  if (view === "list") {
    return (
      <>
        {/* Create class */}
        <TouchableOpacity
          style={[patterns.card, shadows.card, styles.section]}
          onPress={() => setShowCreate((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={styles.headRow}>
            <View
              style={[
                styles.chip,
                { backgroundColor: tint(colors.secondary, 0.12) },
              ]}
            >
              <MaterialIcons name="add" size={18} color={colors.secondary} />
            </View>
            <Text style={styles.cardTitle}>Create a Class</Text>
            <MaterialIcons
              name={showCreate ? "expand-less" : "expand-more"}
              size={20}
              color={colors.outline}
            />
          </View>
          {showCreate && (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Class name (e.g. Science Period 2)"
                placeholderTextColor={colors.outlineVariant}
              />
              <TextInput
                style={styles.input}
                value={newJoinCode}
                onChangeText={(t) => setNewJoinCode(t.toUpperCase())}
                placeholder="Join code (e.g. SCIENCE2026-TOM)"
                placeholderTextColor={colors.outlineVariant}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={createClass}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {classes.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons
              name="cast-for-education"
              size={40}
              color={colors.outlineVariant}
            />
            <Text style={styles.emptyText}>
              No classes yet. Create one above.
            </Text>
          </View>
        ) : (
          classes.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={[patterns.card, shadows.card, styles.section]}
              onPress={() => openClass(cls)}
              activeOpacity={0.8}
            >
              <View style={styles.headRow}>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: tint(colors.secondary, 0.1) },
                  ]}
                >
                  <MaterialIcons
                    name="class"
                    size={18}
                    color={colors.secondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{cls.name}</Text>
                  <Text style={styles.hint}>{cls.join_code}</Text>
                </View>
                <LivePill active={cls.session_active} />
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={colors.outline}
                />
              </View>
            </TouchableOpacity>
          ))
        )}
      </>
    );
  }

  // ── Detail view ──
  const sessionInIds = new Set(sessionMembers.map((m) => m.student_id));

  return (
    <>
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => {
          setView("list");
          if (pollRef.current) clearInterval(pollRef.current);
        }}
      >
        <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>All classes</Text>
      </TouchableOpacity>

      {/* Session control card */}
      <View style={[patterns.card, shadows.card, styles.section]}>
        <View style={styles.headRow}>
          <View
            style={[
              styles.chip,
              { backgroundColor: tint(colors.orange, 0.15) },
            ]}
          >
            <MaterialIcons name="play-circle" size={18} color={colors.orange} />
          </View>
          <Text style={[styles.cardTitle, { flex: 1 }]}>{selected?.name}</Text>
          <LivePill active={!!activeSession} />
        </View>

        {!activeSession ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setSessionModal(true)}
          >
            <MaterialIcons
              name="play-arrow"
              size={20}
              color={colors.onPrimaryContainer}
            />
            <Text style={styles.primaryBtnText}>Start Session</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.sessionInfoRow}>
              <View style={styles.sessionInfoItem}>
                <Text style={styles.sessionInfoLabel}>DURATION</Text>
                <Text style={styles.sessionInfoValue}>
                  {activeSession.duration_minutes} min
                </Text>
              </View>
              <View style={styles.sessionInfoDivider} />
              <View style={styles.sessionInfoItem}>
                <Text style={styles.sessionInfoLabel}>IN SESSION</Text>
                <Text style={styles.sessionInfoValue}>
                  {sessionMembers.length}
                </Text>
              </View>
              <View style={styles.sessionInfoDivider} />
              <View style={styles.sessionInfoItem}>
                <Text style={styles.sessionInfoLabel}>ENROLLED</Text>
                <Text style={styles.sessionInfoValue}>{enrolled.length}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: tint(colors.error, 0.12),
                  marginTop: spacing.sm,
                },
              ]}
              onPress={() =>
                Alert.alert(
                  "End Session?",
                  "All students will be released from School Mode.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "End Session",
                      style: "destructive",
                      onPress: endSession,
                    },
                  ],
                )
              }
            >
              <MaterialIcons name="stop" size={20} color={colors.error} />
              <Text style={[styles.primaryBtnText, { color: colors.error }]}>
                End Session
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Roster — enrolled + session status */}
      {enrolled.length > 0 && (
        <View style={[patterns.card, shadows.card, styles.section]}>
          <View style={styles.headRow}>
            <View
              style={[
                styles.chip,
                { backgroundColor: tint(colors.primary, 0.1) },
              ]}
            >
              <MaterialIcons name="people" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Students ({enrolled.length})</Text>
            {activeSession && (
              <Text style={styles.hint}>
                {sessionMembers.length} in session
              </Text>
            )}
          </View>

          {enrolled.map((m) => {
            const s = m.users;
            const inSession = sessionInIds.has(m.student_id);
            const smember = sessionMembers.find(
              (x) => x.student_id === m.student_id,
            );
            const overrode = smember?.override_at != null;

            return (
              <View key={m.student_id} style={styles.studentRow}>
                <View style={styles.studentInfo}>
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: tint(colors.primary, 0.08) },
                    ]}
                  >
                    <MaterialIcons
                      name="person"
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.label}>{s?.name ?? "Unknown"}</Text>
                    {/* Session status badge */}
                    {activeSession ? (
                      <View style={styles.inlineRow}>
                        <View
                          style={[
                            styles.dot,
                            {
                              backgroundColor: overrode
                                ? colors.error
                                : inSession
                                  ? colors.success
                                  : colors.outlineVariant,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color: overrode
                                ? colors.error
                                : inSession
                                  ? colors.success
                                  : colors.outline,
                            },
                          ]}
                        >
                          {overrode
                            ? "Overrode"
                            : inSession
                              ? "In session"
                              : "Not joined"}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.hint}>Enrolled</Text>
                    )}
                  </View>
                </View>
                {/* Attendance buttons */}
                <View style={styles.attBtns}>
                  {["present", "late", "absent"].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.attBtn,
                        { borderColor: STATUS_COLOR[status] },
                      ]}
                      onPress={() => markAttendance(m.student_id, status)}
                    >
                      <MaterialIcons
                        name={STATUS_ICON[status]}
                        size={14}
                        color={STATUS_COLOR[status]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Override log */}
      {overrides.length > 0 && (
        <View style={[patterns.card, shadows.card, styles.section]}>
          <View style={styles.headRow}>
            <View
              style={[
                styles.chip,
                { backgroundColor: tint(colors.error, 0.1) },
              ]}
            >
              <MaterialIcons name="emergency" size={18} color={colors.error} />
            </View>
            <Text style={styles.cardTitle}>Override Log</Text>
          </View>
          {overrides.map((o) => (
            <View key={o.id} style={styles.recordRow}>
              <View>
                <Text style={styles.label}>{o.users?.name ?? "Unknown"}</Text>
                <Text style={styles.hint}>
                  {new Date(o.overrode_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.pill,
                  {
                    backgroundColor: o.rejoined_at
                      ? tint(colors.success, 0.1)
                      : tint(colors.error, 0.1),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: o.rejoined_at ? colors.success : colors.error },
                  ]}
                >
                  {o.rejoined_at ? "Rejoined" : "Out"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Start session modal */}
      <Modal visible={sessionModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Start Session</Text>

            <Text style={[styles.label, { marginTop: spacing.sm }]}>
              Session code
            </Text>
            <Text style={styles.hint}>
              Type your own or generate one. Tell students verbally.
            </Text>
            <View style={[styles.inputRow, { marginTop: 6 }]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={sessionCodeInput}
                onChangeText={(t) => setSessionCodeInput(t.toUpperCase())}
                placeholder="e.g. FOCUS1"
                placeholderTextColor={colors.outlineVariant}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={() => setSessionCodeInput(genCode(6))}
              >
                <MaterialIcons
                  name="refresh"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.generateBtnText}>Generate</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: spacing.sm }]}>
              Duration (minutes)
            </Text>
            <View style={styles.durationRow}>
              <TouchableOpacity
                style={styles.durationStep}
                onPress={() =>
                  setDurationInput((v) =>
                    String(Math.max(5, (parseInt(v) || 45) - 5)),
                  )
                }
              >
                <MaterialIcons
                  name="remove"
                  size={20}
                  color={colors.warmBrown}
                />
              </TouchableOpacity>
              <TextInput
                style={styles.durationInput}
                value={durationInput}
                onChangeText={setDurationInput}
                keyboardType="number-pad"
                maxLength={3}
              />
              <TouchableOpacity
                style={styles.durationStep}
                onPress={() =>
                  setDurationInput((v) =>
                    String(Math.min(180, (parseInt(v) || 45) + 5)),
                  )
                }
              >
                <MaterialIcons name="add" size={20} color={colors.warmBrown} />
              </TouchableOpacity>
              <Text style={styles.durationUnit}>min</Text>
            </View>

            <View style={[styles.inputRow, { marginTop: spacing.md }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { flex: 1 }]}
                onPress={() => {
                  setSessionModal(false);
                  setSessionCodeInput("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1 }]}
                onPress={startSession}
                disabled={startingSession}
              >
                {startingSession ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Start</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ─── Parent View ──────────────────────────────────────────────────────────────

const ParentView = () => {
  const { user } = useAuth();
  const [child, setChild] = useState(null);
  const [childEmail, setChildEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [homeTimer, setHomeTimer] = useState(45);
  const [schoolModeOn, setSchoolModeOn] = useState(false);

  const load = useCallback(() => {
    async function run() {
      if (!user?.id) return;
      const { data: link } = await supabase
        .from("parent_links")
        .select(
          "student_id, users!parent_links_student_id_fkey(id, name, email)",
        )
        .eq("parent_id", user.id)
        .maybeSingle();
      if (link?.users) {
        setChild(link.users);
        loadChildData(link.student_id);
      }
    }
    run();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadChildData = async (studentId) => {
    const { data: att } = await supabase
      .from("attendance")
      .select("date, status, classes(name)")
      .eq("student_id", studentId)
      .order("date", { ascending: false })
      .limit(10);
    if (att) setAttendance(att);

    const { data: sm } = await supabase
      .from("school_mode")
      .select("is_on")
      .eq("student_id", studentId)
      .maybeSingle();
    if (sm) setSchoolModeOn(sm.is_on);

    const { data: ht } = await supabase
      .from("home_timers")
      .select("duration_minutes")
      .eq("student_id", studentId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ht) setHomeTimer(ht.duration_minutes);
  };

  const linkChild = async () => {
    if (!childEmail.trim()) return;
    setLinking(true);
    const { data: student, error } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("email", childEmail.trim().toLowerCase())
      .eq("role", "student")
      .maybeSingle();
    if (error || !student) {
      Alert.alert("Not found", "No student account found with that email.");
      setLinking(false);
      return;
    }
    await supabase
      .from("parent_links")
      .upsert(
        { parent_id: user.id, student_id: student.id },
        { onConflict: "parent_id,student_id" },
      );
    setChild(student);
    setChildEmail("");
    setLinking(false);
    loadChildData(student.id);
  };

  const saveTimer = async () => {
    if (!child) return;
    await supabase
      .from("home_timers")
      .update({ active: false })
      .eq("student_id", child.id);
    await supabase.from("home_timers").insert({
      student_id: child.id,
      set_by: user.id,
      duration_minutes: homeTimer,
      active: true,
    });
    Alert.alert("Saved", `${homeTimer} min timer set for ${child.name}.`);
  };

  const stepTimer = (delta) =>
    setHomeTimer((v) => Math.max(5, Math.min(120, v + delta)));

  if (!child) {
    return (
      <View style={[patterns.card, shadows.card, styles.section]}>
        <View style={styles.headRow}>
          <View
            style={[
              styles.chip,
              { backgroundColor: tint(colors.tertiary, 0.12) },
            ]}
          >
            <MaterialIcons
              name="child-care"
              size={18}
              color={colors.tertiary}
            />
          </View>
          <Text style={styles.cardTitle}>Link Your Child</Text>
        </View>
        <Text style={styles.hint}>Enter your child's Pawse account email.</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={childEmail}
            onChangeText={setChildEmail}
            placeholder="child@example.com"
            placeholderTextColor={colors.outlineVariant}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={linkChild}
            disabled={linking}
          >
            {linking ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>Link</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      {/* Child status */}
      <View style={[patterns.card, shadows.card, styles.section]}>
        <View style={styles.headRow}>
          <View
            style={[
              styles.chip,
              { backgroundColor: tint(colors.tertiary, 0.12) },
            ]}
          >
            <MaterialIcons
              name="child-care"
              size={18}
              color={colors.tertiary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{child.name}</Text>
            <Text style={styles.hint}>{child.email}</Text>
          </View>
          <View
            style={[
              styles.pill,
              {
                backgroundColor: schoolModeOn
                  ? tint(colors.success, 0.12)
                  : tint(colors.outline, 0.08),
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: schoolModeOn
                    ? colors.success
                    : colors.outlineVariant,
                },
              ]}
            />
            <Text
              style={[
                styles.pillText,
                { color: schoolModeOn ? colors.success : colors.outline },
              ]}
            >
              {schoolModeOn ? "In class" : "Free"}
            </Text>
          </View>
        </View>
      </View>

      {/* Home timer */}
      <View style={[patterns.card, shadows.card, styles.section]}>
        <View style={styles.headRow}>
          <View
            style={[
              styles.chip,
              { backgroundColor: tint(colors.orange, 0.15) },
            ]}
          >
            <MaterialIcons name="timer" size={18} color={colors.orange} />
          </View>
          <Text style={styles.cardTitle}>Home Focus Timer</Text>
        </View>
        {schoolModeOn ? (
          <Text style={styles.hint}>
            Teacher controls the timer during class.
          </Text>
        ) : (
          <>
            <Text style={styles.hint}>
              Set focused screen-away time for home.
            </Text>
            <View style={styles.timerRow}>
              <Text style={styles.label}>Duration</Text>
              <View style={styles.counter}>
                <TouchableOpacity onPress={() => stepTimer(-5)}>
                  <MaterialIcons
                    name="remove"
                    size={20}
                    color={colors.warmBrown}
                  />
                </TouchableOpacity>
                <Text style={styles.counterText}>{homeTimer} min</Text>
                <TouchableOpacity onPress={() => stepTimer(5)}>
                  <MaterialIcons
                    name="add"
                    size={20}
                    color={colors.warmBrown}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={saveTimer}>
              <MaterialIcons
                name="save"
                size={18}
                color={colors.onPrimaryContainer}
              />
              <Text style={styles.primaryBtnText}>Save Timer</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Attendance */}
      <View style={[patterns.card, shadows.card, styles.section]}>
        <View style={styles.headRow}>
          <View
            style={[
              styles.chip,
              { backgroundColor: tint(colors.primary, 0.1) },
            ]}
          >
            <MaterialIcons
              name="event-available"
              size={18}
              color={colors.primary}
            />
          </View>
          <Text style={styles.cardTitle}>Attendance</Text>
        </View>
        {attendance.length === 0 ? (
          <Text style={styles.hint}>No attendance records yet.</Text>
        ) : (
          attendance.map((a, i) => (
            <View key={i} style={styles.recordRow}>
              <View>
                <Text style={styles.label}>
                  {new Date(a.date + "T00:00:00").toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
                {a.classes?.name && (
                  <Text style={styles.hint}>{a.classes.name}</Text>
                )}
              </View>
              <StatusPill status={a.status} />
            </View>
          ))
        )}
      </View>
    </>
  );
};

// ─── Shared small components ──────────────────────────────────────────────────

const LivePill = ({ active }) => (
  <View
    style={[
      styles.pill,
      {
        backgroundColor: active
          ? tint(colors.success, 0.12)
          : tint(colors.outline, 0.08),
      },
    ]}
  >
    <View
      style={[
        styles.dot,
        { backgroundColor: active ? colors.success : colors.outlineVariant },
      ]}
    />
    <Text
      style={[
        styles.pillText,
        { color: active ? colors.success : colors.outline },
      ]}
    >
      {active ? "Live" : "Idle"}
    </Text>
  </View>
);

const StatusPill = ({ status }) => (
  <View
    style={[styles.pill, { backgroundColor: tint(STATUS_COLOR[status], 0.12) }]}
  >
    <MaterialIcons
      name={STATUS_ICON[status]}
      size={12}
      color={STATUS_COLOR[status]}
    />
    <Text style={[styles.pillText, { color: STATUS_COLOR[status] }]}>
      {cap(status)}
    </Text>
  </View>
);

// ─── Root ─────────────────────────────────────────────────────────────────────

const ROLE_META = {
  student: { subtitle: "Student", icon: "school", color: colors.primary },
  teacher: {
    subtitle: "Teacher",
    icon: "cast-for-education",
    color: colors.secondary,
  },
  parent: {
    subtitle: "Parent",
    icon: "family-restroom",
    color: colors.tertiary,
  },
};

const SchoolScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const role = (user?.role ?? "student").toLowerCase();
  const meta = ROLE_META[role] ?? ROLE_META.student;

  // Student lock screen needs to bypass all chrome
  // We render StudentView which handles its own full-screen internally
  if (role === "student") {
    return <StudentViewWrapper insets={insets} meta={meta} />;
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.pageHeader}>
        <View
          style={[styles.chip, { backgroundColor: tint(meta.color, 0.15) }]}
        >
          <MaterialIcons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View>
          <Text style={styles.pageTitle}>School</Text>
          <Text style={styles.pageSubtitle}>{meta.subtitle} view</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {role === "teacher" && <TeacherView />}
        {role === "parent" && <ParentView />}
      </ScrollView>
    </View>
  );
};

// StudentViewWrapper: either shows lock screen (full screen) or normal scrollable UI
const StudentViewWrapper = ({ insets, meta }) => {
  // StudentView manages its own lock state internally and returns
  // StudentLockScreen (full screen) or the normal list/detail UI.
  // We wrap in a flex:1 container so it fills correctly either way.
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceContainerLow }}>
      <StatusBar barStyle="dark-content" />
      {/* Header — hidden when lock screen is showing (lock screen sets its own StatusBar) */}
      <StudentViewInner insets={insets} meta={meta} />
    </View>
  );
};

// Inner wrapper that conditionally shows header or not
const StudentViewInner = ({ insets, meta }) => {
  const { user } = useAuth();

  const [view, setView] = useState("list");
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [attendance, setAttendance] = useState([]);

  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  const [schoolModeOn, setSchoolModeOn] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  const [sessionModal, setSessionModal] = useState(false);
  const [sessionCodeInput, setSessionCodeInput] = useState("");

  const loadAll = useCallback(() => {
    async function run() {
      if (!user?.id) return;
      const { data: members } = await supabase
        .from("class_members")
        .select(
          "class_id, classes(id, name, join_code, session_active, session_started_at)",
        )
        .eq("student_id", user.id);
      if (members) setClasses(members.map((m) => m.classes).filter(Boolean));

      const { data: sm } = await supabase
        .from("school_mode")
        .select("is_on, locked, class_id, session_id")
        .eq("student_id", user.id)
        .maybeSingle();

      if (sm?.is_on && sm?.session_id) {
        const { data: sess } = await supabase
          .from("class_sessions")
          .select(
            "id, class_id, duration_minutes, started_at, session_code, active",
          )
          .eq("id", sm.session_id)
          .maybeSingle();
        if (sess?.active) {
          setSchoolModeOn(true);
          activeSessionRef.current = sess;
          setActiveSession(sess);
        } else {
          await supabase
            .from("school_mode")
            .update({ is_on: false, locked: false, session_id: null })
            .eq("student_id", user.id);
          setSchoolModeOn(false);
          setActiveSession(null);
        }
      } else {
        setSchoolModeOn(false);
        setActiveSession(null);
      }
    }
    run();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      const id = setInterval(loadAll, 5000);
      return () => clearInterval(id);
    }, [loadAll]),
  );

  const openClass = async (cls) => {
    setSelected(cls);
    setView("detail");
    const { data: att } = await supabase
      .from("attendance")
      .select("date, status")
      .eq("student_id", user.id)
      .eq("class_id", cls.id)
      .order("date", { ascending: false })
      .limit(10);
    if (att) setAttendance(att);
  };

  const joinClass = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    const { data: cls, error } = await supabase
      .from("classes")
      .select("id, name")
      .eq("join_code", joinCode.trim().toUpperCase())
      .maybeSingle();
    if (error || !cls) {
      Alert.alert("Not found", "Check the class code with your teacher.");
      setJoinLoading(false);
      return;
    }
    await supabase
      .from("class_members")
      .upsert(
        { class_id: cls.id, student_id: user.id },
        { onConflict: "class_id,student_id" },
      );
    setJoinCode("");
    setShowJoin(false);
    setJoinLoading(false);
    loadAll();
    Alert.alert("Joined!", `You're now in ${cls.name}.`);
  };

  const handleTurnOn = () => {
    if (!selected?.session_active) {
      Alert.alert(
        "No active session",
        "Your teacher hasn't started a session yet.",
      );
      return;
    }
    setSessionModal(true);
  };

  const confirmSessionCode = async () => {
    const code = sessionCodeInput.trim().toUpperCase();
    if (!code) return;
    const { data: sess } = await supabase
      .from("class_sessions")
      .select("id, duration_minutes, started_at, session_code")
      .eq("class_id", selected.id)
      .eq("active", true)
      .maybeSingle();
    if (!sess || sess.session_code !== code) {
      Alert.alert("Wrong code", "Check with your teacher and try again.");
      return;
    }
    await supabase.from("class_session_members").upsert(
      {
        session_id: sess.id,
        class_id: selected.id,
        student_id: user.id,
        joined_at: new Date().toISOString(),
      },
      { onConflict: "session_id,student_id" },
    );

    await supabase.from("school_mode").upsert(
      {
        student_id: user.id,
        is_on: true,
        locked: true,
        class_id: selected.id,
        session_id: sess.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    );

    activeSessionRef.current = sess;
    setActiveSession(sess);
    setSchoolModeOn(true);
    setSessionModal(false);
    setSessionCodeInput("");
  };

  const handleOverride = () => {
    setSchoolModeOn(false);
    setActiveSession(null);
  };

  // Full screen lock — no header, no scroll
  if (schoolModeOn && activeSession) {
    const classInfo =
      classes.find((c) => c.id === activeSession.class_id) ?? selected;
    return (
      <StudentLockScreen
        classInfo={classInfo}
        session={activeSession}
        onOverride={handleOverride}
      />
    );
  }

  // Normal UI
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + 4 }]}>
        <View
          style={[styles.chip, { backgroundColor: tint(meta.color, 0.15) }]}
        >
          <MaterialIcons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View>
          <Text style={styles.pageTitle}>School</Text>
          <Text style={styles.pageSubtitle}>{meta.subtitle} view</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Join class */}
        <TouchableOpacity
          style={[patterns.card, shadows.card, styles.section]}
          onPress={() => setShowJoin((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={styles.headRow}>
            <View
              style={[
                styles.chip,
                { backgroundColor: tint(colors.primary, 0.12) },
              ]}
            >
              <MaterialIcons name="add" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Join a Class</Text>
            <MaterialIcons
              name={showJoin ? "expand-less" : "expand-more"}
              size={20}
              color={colors.outline}
            />
          </View>
          {showJoin && (
            <View style={[styles.inputRow, { marginTop: spacing.sm }]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
                placeholder="e.g. SCIENCE2026-TOM"
                placeholderTextColor={colors.outlineVariant}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={joinClass}
                disabled={joinLoading}
              >
                {joinLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Join</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {view === "list" &&
          (classes.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons
                name="school"
                size={40}
                color={colors.outlineVariant}
              />
              <Text style={styles.emptyText}>
                No classes yet. Join one above.
              </Text>
            </View>
          ) : (
            classes.map((cls) => (
              <TouchableOpacity
                key={cls.id}
                style={[patterns.card, shadows.card, styles.section]}
                onPress={() => openClass(cls)}
                activeOpacity={0.8}
              >
                <View style={styles.headRow}>
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: tint(colors.primary, 0.1) },
                    ]}
                  >
                    <MaterialIcons
                      name="class"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{cls.name}</Text>
                    <Text style={styles.hint}>{cls.join_code}</Text>
                  </View>
                  <LivePill active={cls.session_active} />
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={colors.outline}
                  />
                </View>
              </TouchableOpacity>
            ))
          ))}

        {view === "detail" && (
          <>
            <TouchableOpacity
              style={styles.backRow}
              onPress={() => setView("list")}
            >
              <MaterialIcons
                name="arrow-back"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.backText}>All classes</Text>
            </TouchableOpacity>

            <View style={[patterns.card, shadows.card, styles.section]}>
              <View style={styles.headRow}>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: tint(colors.primary, 0.1) },
                  ]}
                >
                  <MaterialIcons
                    name="class"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{selected?.name}</Text>
                  <Text style={styles.hint}>{selected?.join_code}</Text>
                </View>
                <LivePill active={selected?.session_active} />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  !selected?.session_active && { opacity: 0.35 },
                ]}
                onPress={handleTurnOn}
                disabled={!selected?.session_active}
              >
                <MaterialIcons
                  name="lock"
                  size={18}
                  color={colors.onPrimaryContainer}
                />
                <Text style={styles.primaryBtnText}>Turn on School Mode</Text>
              </TouchableOpacity>

              {!selected?.session_active && (
                <Text style={[styles.hint, { textAlign: "center" }]}>
                  Waiting for your teacher to start a session.
                </Text>
              )}
            </View>

            <View style={[patterns.card, shadows.card, styles.section]}>
              <View style={styles.headRow}>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: tint(colors.primary, 0.1) },
                  ]}
                >
                  <MaterialIcons
                    name="event-available"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.cardTitle}>My Attendance</Text>
              </View>
              {attendance.length === 0 ? (
                <Text style={styles.hint}>No records yet for this class.</Text>
              ) : (
                attendance.map((a, i) => (
                  <View key={i} style={styles.recordRow}>
                    <Text style={styles.label}>
                      {new Date(a.date + "T00:00:00").toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                    <StatusPill status={a.status} />
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Session code modal */}
      <Modal visible={sessionModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Enter Session Code</Text>
            <Text style={styles.hint}>
              Your teacher will tell you this at the start of class.
            </Text>
            <TextInput
              style={styles.codeInput}
              value={sessionCodeInput}
              onChangeText={(t) => setSessionCodeInput(t.toUpperCase())}
              placeholder="Enter code"
              placeholderTextColor={colors.outlineVariant}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { flex: 1 }]}
                onPress={() => {
                  setSessionModal(false);
                  setSessionCodeInput("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1 }]}
                onPress={confirmSessionCode}
              >
                <Text style={styles.actionBtnText}>Turn On</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceContainerLow },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.containerPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.orange}18`,
  },
  pageTitle: { ...typography.h3, color: colors.warmBrown },
  pageSubtitle: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.outline,
  },
  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.gutter,
  },

  section: { gap: spacing.sm },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { ...typography.bodyMd, color: colors.primary, fontWeight: "600" },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },

  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: {
    ...typography.bodyMd,
    color: colors.outline,
    textAlign: "center",
  },

  cardTitle: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  label: {
    ...typography.bodyMd,
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: "600",
  },
  hint: { ...typography.bodySm, color: colors.outline, marginTop: 2 },
  statusText: { ...typography.labelCaps, fontSize: 9 },

  chip: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  pillText: { ...typography.labelCaps, fontSize: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  inputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  input: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  codeInput: {
    ...typography.h2,
    fontSize: 22,
    letterSpacing: 4,
    color: colors.warmBrown,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    textAlign: "center",
    paddingVertical: 10,
    width: "100%",
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { ...typography.bodySm, color: "#fff", fontWeight: "700" },
  cancelBtn: {
    borderRadius: radii.lg,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  cancelBtnText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "600",
  },

  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  generateBtnText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "600",
  },

  primaryBtn: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii["2xl"],
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryBtnText: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
    fontWeight: "700",
  },

  // Session info strip (teacher live view)
  sessionInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tint(colors.success, 0.06),
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
    gap: 0,
  },
  sessionInfoItem: { flex: 1, alignItems: "center", gap: 2 },
  sessionInfoLabel: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.outline,
  },
  sessionInfoValue: { ...typography.h3, fontSize: 18, color: colors.warmBrown },
  sessionInfoDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.outlineVariant,
  },

  // Roster
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  attBtns: { flexDirection: "row", gap: 6 },
  attBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },

  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  counterText: {
    ...typography.bodySm,
    color: colors.warmBrown,
    minWidth: 56,
    textAlign: "center",
  },

  // Duration picker in teacher modal
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 6,
  },
  durationStep: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  durationInput: {
    ...typography.h2,
    fontSize: 22,
    color: colors.warmBrown,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    minWidth: 60,
    textAlign: "center",
    paddingVertical: 4,
  },
  durationUnit: { ...typography.bodyMd, color: colors.outline },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(30,20,10,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.containerPadding,
  },
  modalCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["4xl"],
    padding: spacing.md,
    width: "100%",
    gap: spacing.sm,
    ...shadows.soft,
  },
});

export default SchoolScreen;
