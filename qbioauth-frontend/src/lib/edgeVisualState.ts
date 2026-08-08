import { FAILURE_CODE_LABELS, type FailureCode, type Phase, type PhaseState } from "../types/protocol";
import type { LastFailure } from "../store/protocolStore";

export const PHASE_LABELS: Record<Phase, string> = {
  SESSION: "Session",
  MUTUAL_AUTH: "Mutual authentication",
  ENROLLMENT: "Enrollment",
  USER_AUTH: "Biometric verification",
  QAUTH_TOKEN: "QAuth token",
  QKD_TRANSMISSION: "Quantum transmission",
  QKD_SIFTING: "Basis sifting",
  QKD_PARAMETER_ESTIMATION: "QBER estimation",
  QKD_RECONCILIATION: "Cascade reconciliation",
  QKD_PRIVACY_AMPLIFICATION: "Privacy amplification",
  KEY_DERIVATION: "Key derivation",
  AES_CHANNEL: "Secure channel",
};

// ATTACK_DETECTED is distinct from FAILURE: a real intercept-resend attack
// confirmed via QBER spike, not a generic/natural-noise failure — this is
// the demo's single biggest "wow" moment and must not look like a routine
// error (see FailureCode.EAVESDROPPER_DETECTED).
export type EdgeVisualKind = "IDLE" | "ACTIVE" | "INTERMEDIATE_SUCCESS" | "FINAL_SUCCESS" | "FAILURE" | "ATTACK_DETECTED";

export interface EdgeVisualState {
  kind: EdgeVisualKind;
  label?: string;
  phase?: Phase;
}

// Phases fire strictly in order within a run, so the "last phase in the
// ordered list that isn't IDLE" is always the one currently in progress
// (or the terminal outcome) for that edge.
export function computeEdgeVisualState(
  phaseState: PhaseState,
  orderedPhases: Phase[],
  finalPhase: Phase | null,
  lastFailure: LastFailure | null,
): EdgeVisualState {
  let lastTouched: Phase | null = null;
  for (const phase of orderedPhases) {
    if (phaseState[phase]) {
      lastTouched = phase;
    }
  }

  if (!lastTouched) {
    return { kind: "IDLE" };
  }

  const entry = phaseState[lastTouched];

  if (entry.status === "FAILURE") {
    const code = lastFailure?.code as FailureCode | undefined;
    const label = code ? FAILURE_CODE_LABELS[code] : (lastFailure?.message ?? "Failed");
    if (code === "EAVESDROPPER_DETECTED") {
      return { kind: "ATTACK_DETECTED", label, phase: lastTouched };
    }
    return { kind: "FAILURE", label, phase: lastTouched };
  }

  if (entry.status === "STARTED" || entry.status === "PROGRESS") {
    return { kind: "ACTIVE", label: PHASE_LABELS[lastTouched], phase: lastTouched };
  }

  // SUCCESS
  if (finalPhase && lastTouched === finalPhase) {
    return { kind: "FINAL_SUCCESS", label: PHASE_LABELS[lastTouched], phase: lastTouched };
  }
  return { kind: "INTERMEDIATE_SUCCESS", label: PHASE_LABELS[lastTouched], phase: lastTouched };
}
