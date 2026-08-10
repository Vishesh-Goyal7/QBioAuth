import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  FailureCode,
  Phase,
  PhaseState,
  PhaseStatus,
  ProtocolEvent,
  QkdConfigDefaultsResponse,
  QkdRunConfiguration,
  RawSecretsRevealedPayload,
} from "../types/protocol";
import { normalizeBaseUrl, toWsBaseUrl } from "../lib/apiClient";
import { saveIrisCredential } from "../lib/irisCredentialStorage";

export type ConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";
export type SessionOutcome = "IN_PROGRESS" | "COMPLETED" | "FAILED" | null;

export interface ChatCiphertext {
  nonce_b64: string;
  ciphertext_b64: string;
  associated_data_b64: string;
}

export interface ChatMessage {
  id: string;
  direction: "T->S" | "S->T";
  text: string;
  verified: boolean | null;
  sequenceNumber?: number;
  ciphertext?: ChatCiphertext | null;
}

export interface LastFailure {
  code?: FailureCode;
  message: string;
  failedAtPhase?: string;
}

// v2: the one-time-issued iris credential from ENROLLMENT.IRIS_CODE_ISSUED.
// Held in the store (not just localStorage) so the callout/modal can react
// to it immediately, and cleared explicitly by the user dismissing it —
// never silently, since this is the only place this value is ever shown.
export interface IssuedIrisCredential {
  email: string;
  iris_code: string;
  iris_fingerprint: string;
  warning: string;
}

// v3: distance/eavesdropper summary shown above the diagram. "requested" is
// what SESSION_STARTED reported (what the client asked for); "effective" is
// what QKD_TRANSMISSION.TRANSMISSION_STARTED reports the backend actually
// used, including its own resolved defaults for anything the user never
// touched in the config panel.
export interface RunParameters {
  distanceKm: number;
  eavesdropperPresent: boolean;
  source: "requested" | "effective";
  resolvedConfiguration?: QkdRunConfiguration;
}

const LOCAL_STORAGE_KEY = "qbioauth_api_base_url";

function getPhaseStatus(phaseState: PhaseState, phase: Phase): PhaseStatus {
  return phaseState[phase]?.status ?? "IDLE";
}

interface ProtocolStoreState {
  // connection / config
  apiBaseUrl: string | null;
  wsBaseUrl: string | null;
  connectionStatus: ConnectionStatus;

  // current run
  sessionId: string | null;
  mode: "ENROLL" | "AUTHENTICATE" | null;
  // Email used for the command that started the current run — captured at
  // send-time since IRIS_CODE_ISSUED (enrollment) arrives before
  // SESSION_COMPLETED and doesn't carry the email itself.
  currentRunEmail: string | null;
  events: ProtocolEvent[];
  phaseState: PhaseState;
  sessionOutcome: SessionOutcome;
  lastFailure: LastFailure | null;
  issuedIrisCredential: IssuedIrisCredential | null;
  runParameters: RunParameters | null;

  // v3: QKD "Protocol configuration" panel state. Deliberately NOT reset
  // by startNewSession/reset — these are user-dialed-in preferences meant
  // to persist across repeated runs in the same browser session, same as
  // the config panel itself staying expanded/collapsed would.
  qkdConfigDefaults: QkdConfigDefaultsResponse | null;
  qkdConfigValues: Record<string, number>;
  qkdConfigTouchedKeys: string[];
  distanceKm: number;
  distanceTouched: boolean;

  // v4: opt-in, instructional-demo-only "reveal secrets" mode. Unlike the
  // QKD config values above, this is deliberately reset on every
  // startNewSession/reset — it must never become a standing preference
  // that silently carries into the next run.
  revealSecretsEnabled: boolean;
  // The one-time payload from KEY_DERIVATION.RAW_SECRETS_REVEALED, if the
  // current run had reveal_secrets enabled. This is the only place raw
  // derived key material is ever held client-side. Kept around (not wiped
  // on dismiss) so the chat view's "show keys" button can reopen the same
  // data later — visibility is tracked separately.
  revealedSecrets: RawSecretsRevealedPayload | null;
  revealedSecretsVisible: boolean;

  // Node "is active right now" flags for ProtocolDiagram, recomputed from
  // each incoming event. Not a plain actor->node mapping: the wire
  // protocol's `actor` for iris-capture events is "TERMINAL" (the device
  // doing the capturing), but the diagram's User node should be the one
  // that visibly pulses during capture — so these are derived per
  // phase+step, not a generic actor lookup.
  terminalNodeActive: boolean;
  serverNodeActive: boolean;
  userNodeActive: boolean;

  // AES channel (post-auth)
  channelEstablished: boolean;
  chatMessages: ChatMessage[];
  chatError: string | null;

  // replay (Section 9.7) — re-drives ingestEvent from an already-received
  // snapshot, never touches the socket or backend.
  isReplaying: boolean;

  // actions
  setApiBaseUrl: (url: string) => void;
  clearApiBaseUrl: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  startNewSession: (mode: "ENROLL" | "AUTHENTICATE") => string;
  setCurrentRunEmail: (email: string) => void;
  ingestEvent: (event: ProtocolEvent) => void;
  pushOptimisticChatMessage: (direction: "T->S" | "S->T", text: string) => string;
  clearChatError: () => void;
  dismissIssuedIrisCredential: () => void;
  setQkdConfigDefaults: (defaults: QkdConfigDefaultsResponse) => void;
  setQkdConfigValue: (key: string, value: number) => void;
  setDistanceKm: (value: number) => void;
  resetQkdConfigToDefaults: () => void;
  setRevealSecretsEnabled: (value: boolean) => void;
  openRevealedSecrets: () => void;
  dismissRevealedSecrets: () => void;
  startReplay: () => void;
  setReplaying: (value: boolean) => void;
  reset: () => void;
}

export const useProtocolStore = create<ProtocolStoreState>((set) => ({
  apiBaseUrl:
    typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_STORAGE_KEY) : null,
  wsBaseUrl:
    typeof window !== "undefined" && window.localStorage.getItem(LOCAL_STORAGE_KEY)
      ? toWsBaseUrl(window.localStorage.getItem(LOCAL_STORAGE_KEY) as string)
      : null,
  connectionStatus: "DISCONNECTED",

  sessionId: null,
  mode: null,
  currentRunEmail: null,
  events: [],
  phaseState: {},
  sessionOutcome: null,
  lastFailure: null,
  issuedIrisCredential: null,
  runParameters: null,

  qkdConfigDefaults: null,
  qkdConfigValues: {},
  qkdConfigTouchedKeys: [],
  distanceKm: 5.0,
  distanceTouched: false,

  revealSecretsEnabled: false,
  revealedSecrets: null,
  revealedSecretsVisible: false,

  terminalNodeActive: false,
  serverNodeActive: false,
  userNodeActive: false,

  channelEstablished: false,
  chatMessages: [],
  chatError: null,
  isReplaying: false,

  setApiBaseUrl: (url) => {
    const normalized = normalizeBaseUrl(url);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, normalized);
    set({ apiBaseUrl: normalized, wsBaseUrl: toWsBaseUrl(normalized) });
  },

  clearApiBaseUrl: () => {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    set({ apiBaseUrl: null, wsBaseUrl: null, connectionStatus: "DISCONNECTED" });
  },

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  startNewSession: (mode) => {
    const sessionId = uuidv4();
    set({
      sessionId,
      mode,
      currentRunEmail: null,
      events: [],
      phaseState: {},
      sessionOutcome: "IN_PROGRESS",
      lastFailure: null,
      issuedIrisCredential: null,
      runParameters: null,
      // Reset every run — never a standing preference. The command object
      // for THIS run was already built by the caller before this fires,
      // so this only affects what the panel shows for the *next* run.
      revealSecretsEnabled: false,
      revealedSecrets: null,
      revealedSecretsVisible: false,
      terminalNodeActive: false,
      serverNodeActive: false,
      userNodeActive: false,
      channelEstablished: false,
      chatMessages: [],
      chatError: null,
    });
    return sessionId;
  },

  setCurrentRunEmail: (email) => set({ currentRunEmail: email }),

  ingestEvent: (event) => {
    set((state) => {
      const nextPhaseState: PhaseState = {
        ...state.phaseState,
        [event.phase]: { latestEvent: event, status: event.status },
      };

      let sessionOutcome = state.sessionOutcome;
      let lastFailure = state.lastFailure;
      let channelEstablished = state.channelEstablished;
      let chatMessages = state.chatMessages;

      if (event.status === "FAILURE") {
        const payload = event.payload as Record<string, unknown>;
        const failureCode = payload.failure_code as FailureCode | undefined;
        const failureMessage = (payload.failure_message as string | undefined) ?? event.message;
        // Prefer the phase-specific failure event's code/message; a later
        // generic SESSION_FAILED without a failure_code should not blank
        // out a more specific one we already captured.
        if (failureCode || !lastFailure) {
          lastFailure = { code: failureCode, message: failureMessage };
        }
        if (event.phase === "SESSION" && "failed_at_phase" in payload) {
          lastFailure = { ...lastFailure, failedAtPhase: payload.failed_at_phase as string };
        }
      }

      // v3: "requested" params from SESSION_STARTED, upgraded to
      // "effective" (backend-resolved, including its own defaults) once
      // QKD_TRANSMISSION.TRANSMISSION_STARTED arrives.
      let runParameters = state.runParameters;
      if (event.phase === "SESSION" && event.step === "SESSION_STARTED") {
        const payload = event.payload as { mode: string; distance_km?: number; eavesdropper_present?: boolean };
        runParameters =
          payload.mode === "AUTHENTICATE"
            ? {
                distanceKm: payload.distance_km ?? 5.0,
                eavesdropperPresent: payload.eavesdropper_present ?? false,
                source: "requested",
              }
            : null;
      }
      if (event.phase === "QKD_TRANSMISSION" && event.step === "TRANSMISSION_STARTED") {
        const payload = event.payload as {
          distance_km: number;
          eavesdropper_present: boolean;
          configuration: QkdRunConfiguration;
        };
        runParameters = {
          distanceKm: payload.distance_km,
          eavesdropperPresent: payload.eavesdropper_present,
          source: "effective",
          resolvedConfiguration: payload.configuration,
        };
      }

      if (event.phase === "SESSION" && event.step === "SESSION_COMPLETED") {
        sessionOutcome = "COMPLETED";
      } else if (event.phase === "SESSION" && event.step === "SESSION_FAILED") {
        sessionOutcome = "FAILED";
      }

      if (event.phase === "AES_CHANNEL" && event.step === "CHANNEL_ESTABLISHED" && event.status === "SUCCESS") {
        channelEstablished = true;
      }

      let chatError = state.chatError;
      if (event.phase === "AES_CHANNEL" && event.step === "MESSAGE_SENT" && event.status === "FAILURE") {
        chatError = "No secure channel yet — authenticate first.";
      }

      // v2: MESSAGE_SENT now carries the real plaintext + AES-GCM material.
      // Two cases: (a) confirming a message *this* client just sent
      // optimistically (match on direction + not-yet-confirmed), or
      // (b) a fresh message this client never requested — e.g. the
      // backend's auto_reply generating the opposite-direction leg on its
      // own — which has no pending optimistic entry to match, so it's
      // appended as a brand-new bubble instead of being dropped.
      if (event.phase === "AES_CHANNEL" && event.step === "MESSAGE_SENT" && event.status === "SUCCESS") {
        const payload = event.payload as {
          direction: "T->S" | "S->T";
          sequence_number: number;
          plaintext: string;
          nonce_b64: string;
          ciphertext_b64: string;
          associated_data_b64: string;
        };
        const ciphertext: ChatCiphertext = {
          nonce_b64: payload.nonce_b64,
          ciphertext_b64: payload.ciphertext_b64,
          associated_data_b64: payload.associated_data_b64,
        };
        const pendingIdx = chatMessages.findIndex(
          (m) => m.direction === payload.direction && m.ciphertext == null && m.verified === null,
        );
        if (pendingIdx !== -1) {
          chatMessages = [...chatMessages];
          chatMessages[pendingIdx] = {
            ...chatMessages[pendingIdx],
            text: payload.plaintext,
            sequenceNumber: payload.sequence_number,
            ciphertext,
          };
        } else {
          chatMessages = [
            ...chatMessages,
            {
              id: event.event_id,
              direction: payload.direction,
              text: payload.plaintext,
              verified: null,
              sequenceNumber: payload.sequence_number,
              ciphertext,
            },
          ];
        }
      }

      if (event.phase === "AES_CHANNEL" && event.step === "MESSAGE_DECRYPTED") {
        const payload = event.payload as {
          direction?: "T->S" | "S->T";
          sequence_number?: number;
          plaintext?: string;
          verified?: boolean;
        };
        const idx = chatMessages.findIndex(
          (m) => m.direction === payload.direction && m.sequenceNumber === payload.sequence_number,
        );
        if (idx !== -1) {
          chatMessages = [...chatMessages];
          chatMessages[idx] = {
            ...chatMessages[idx],
            text: payload.plaintext ?? chatMessages[idx].text,
            verified: payload.verified ?? null,
          };
        } else if (payload.direction) {
          chatMessages = [
            ...chatMessages,
            {
              id: event.event_id,
              direction: payload.direction,
              text: payload.plaintext ?? "",
              verified: payload.verified ?? null,
              sequenceNumber: payload.sequence_number,
              ciphertext: null,
            },
          ];
        }
      }

      // v2: the only moment the raw iris code ever appears — capture it
      // for the required callout/modal, and cache it locally so the same
      // browser session doesn't force a re-paste at authenticate time.
      let issuedIrisCredential = state.issuedIrisCredential;
      if (event.phase === "ENROLLMENT" && event.step === "IRIS_CODE_ISSUED" && event.status === "SUCCESS") {
        const payload = event.payload as { iris_code: string; iris_fingerprint: string; warning: string };
        const email = state.currentRunEmail ?? "";
        issuedIrisCredential = {
          email,
          iris_code: payload.iris_code,
          iris_fingerprint: payload.iris_fingerprint,
          warning: payload.warning,
        };
        if (email) {
          saveIrisCredential(email, payload.iris_code, payload.iris_fingerprint);
        }
      }

      // v4: the only moment raw derived key material ever appears —
      // opt-in, instructional-demo-only (see reveal_secrets on the
      // authenticate command).
      let revealedSecrets = state.revealedSecrets;
      let revealedSecretsVisible = state.revealedSecretsVisible;
      if (event.phase === "KEY_DERIVATION" && event.step === "RAW_SECRETS_REVEALED" && event.status === "SUCCESS") {
        revealedSecrets = event.payload as RawSecretsRevealedPayload;
        revealedSecretsVisible = true;
      }

      const isIrisCaptureStep = event.step === "IRIS_CAPTURE_STARTED" || event.step === "IRIS_CAPTURE_COMPLETE";
      const isActiveStatus = event.status === "STARTED" || event.status === "PROGRESS";
      const userNodeActive = isActiveStatus && isIrisCaptureStep;
      const terminalNodeActive = isActiveStatus && event.actor === "TERMINAL" && !isIrisCaptureStep;
      const serverNodeActive = isActiveStatus && event.actor === "SERVER";

      return {
        events: [...state.events, event],
        phaseState: nextPhaseState,
        sessionOutcome,
        lastFailure,
        issuedIrisCredential,
        runParameters,
        revealedSecrets,
        revealedSecretsVisible,
        terminalNodeActive,
        serverNodeActive,
        userNodeActive,
        channelEstablished,
        chatMessages,
        chatError,
      };
    });
  },

  pushOptimisticChatMessage: (direction, text) => {
    const id = uuidv4();
    set((state) => ({
      chatMessages: [...state.chatMessages, { id, direction, text, verified: null }],
      chatError: null,
    }));
    return id;
  },

  clearChatError: () => set({ chatError: null }),

  // Caller must snapshot state.events *before* calling this — it clears
  // the board back to a blank slate so replayed events can be re-ingested
  // in order without duplicating the just-completed run's log.
  startReplay: () =>
    set({
      events: [],
      phaseState: {},
      lastFailure: null,
      issuedIrisCredential: null,
      runParameters: null,
      revealedSecrets: null,
      revealedSecretsVisible: false,
      terminalNodeActive: false,
      serverNodeActive: false,
      userNodeActive: false,
      channelEstablished: false,
      chatMessages: [],
      chatError: null,
      isReplaying: true,
    }),

  setReplaying: (value) => set({ isReplaying: value }),

  dismissIssuedIrisCredential: () => set({ issuedIrisCredential: null }),

  setRevealSecretsEnabled: (value) => set({ revealSecretsEnabled: value }),

  // Hides the modal without discarding the data, so the "show keys" button
  // in the chat view can reopen the same reveal later in the same run.
  dismissRevealedSecrets: () => set({ revealedSecretsVisible: false }),

  openRevealedSecrets: () =>
    set((state) => (state.revealedSecrets ? { revealedSecretsVisible: true } : {})),

  setQkdConfigDefaults: (defaults) => {
    const values: Record<string, number> = {};
    for (const param of defaults.parameters) {
      values[param.key] = param.default;
    }
    set({
      qkdConfigDefaults: defaults,
      qkdConfigValues: values,
      qkdConfigTouchedKeys: [],
      distanceKm: defaults.default_distance_km,
      distanceTouched: false,
    });
  },

  setQkdConfigValue: (key, value) =>
    set((state) => ({
      qkdConfigValues: { ...state.qkdConfigValues, [key]: value },
      qkdConfigTouchedKeys: state.qkdConfigTouchedKeys.includes(key)
        ? state.qkdConfigTouchedKeys
        : [...state.qkdConfigTouchedKeys, key],
    })),

  setDistanceKm: (value) => set({ distanceKm: value, distanceTouched: true }),

  resetQkdConfigToDefaults: () =>
    set((state) => {
      if (!state.qkdConfigDefaults) return {};
      const values: Record<string, number> = {};
      for (const param of state.qkdConfigDefaults.parameters) {
        values[param.key] = param.default;
      }
      return {
        qkdConfigValues: values,
        qkdConfigTouchedKeys: [],
        distanceKm: state.qkdConfigDefaults.default_distance_km,
        distanceTouched: false,
      };
    }),

  reset: () =>
    set({
      sessionId: null,
      mode: null,
      currentRunEmail: null,
      events: [],
      phaseState: {},
      sessionOutcome: null,
      lastFailure: null,
      issuedIrisCredential: null,
      runParameters: null,
      revealSecretsEnabled: false,
      revealedSecrets: null,
      revealedSecretsVisible: false,
      terminalNodeActive: false,
      serverNodeActive: false,
      userNodeActive: false,
      channelEstablished: false,
      chatMessages: [],
      chatError: null,
      isReplaying: false,
    }),
}));

export function usePhaseStatus(phase: Phase): PhaseStatus {
  return useProtocolStore((state) => getPhaseStatus(state.phaseState, phase));
}

export { getPhaseStatus };
