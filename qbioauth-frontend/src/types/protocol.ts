// Wire-format types for the QBioAuth WebSocket protocol event stream.
// Source of truth: qbioauth_frontend_spec.md Section 3.3/3.4, cross-checked
// against the actual FastAPI cell (Code/Q_Bio_Auth.ipynb, "FastAPI Setup" cell).

export type Phase =
  | "SESSION"
  | "MUTUAL_AUTH"
  | "ENROLLMENT"
  | "USER_AUTH"
  | "QAUTH_TOKEN"
  | "QKD_TRANSMISSION"
  | "QKD_SIFTING"
  | "QKD_PARAMETER_ESTIMATION"
  | "QKD_RECONCILIATION"
  | "QKD_PRIVACY_AMPLIFICATION"
  | "KEY_DERIVATION"
  | "AES_CHANNEL";

export type EventStatus = "STARTED" | "PROGRESS" | "SUCCESS" | "FAILURE";

export type Actor = "TERMINAL" | "SERVER" | "USER" | "SYSTEM";

// Appears in payload.failure_code on FAILURE-status events. Not every
// FAILURE event carries one (the backend is inconsistent about this —
// SESSION_FAILED sometimes only carries failed_at_phase) so consumers
// should also read the phase-specific FAILURE event alongside it.
export type FailureCode =
  | "MUTUAL_AUTH_FAILED"
  | "USER_NOT_FOUND"
  | "KEY_RECONSTRUCTION_FAILED"
  | "SIGNATURE_INVALID"
  | "QBER_THRESHOLD_EXCEEDED"
  | "RECONCILIATION_FAILED"
  | "CONFIRMATION_MISMATCH"
  | "UNKNOWN_ACTION"
  | "UNEXPECTED_ERROR"
  | "NO_ACTIVE_CHANNEL"
  | "MISSING_IRIS_CODE"
  // v3: a real intercept-resend attack, distinct from QBER_THRESHOLD_EXCEEDED
  // (which also covers ordinary channel noise crossing the threshold).
  | "EAVESDROPPER_DETECTED";

export const FAILURE_CODE_LABELS: Record<FailureCode, string> = {
  MUTUAL_AUTH_FAILED: "Terminal/server mutual authentication failed",
  USER_NOT_FOUND: "No enrolled user matches this email",
  KEY_RECONSTRUCTION_FAILED: "Could not reconstruct credential from biometric sample",
  SIGNATURE_INVALID: "Recovered signature failed verification",
  QBER_THRESHOLD_EXCEEDED: "Possible eavesdropper detected",
  RECONCILIATION_FAILED: "Cascade reconciliation failed",
  CONFIRMATION_MISMATCH: "Derived key confirmation mismatch",
  UNKNOWN_ACTION: "Unknown command sent to server",
  UNEXPECTED_ERROR: "Unexpected server error",
  NO_ACTIVE_CHANNEL: "No secure channel yet — authenticate first",
  MISSING_IRIS_CODE: "Iris code is required to authenticate",
  EAVESDROPPER_DETECTED: "Eavesdropper detected — intercept-resend attack confirmed",
};

interface EventBase {
  event_id: string;
  session_id: string;
  seq: number;
  timestamp: string;
  actor: Actor;
  message: string;
}

export interface EnrollSessionStartedPayload {
  mode: "ENROLL";
}
// v3: AUTHENTICATE-mode SESSION_STARTED now reports the requested run
// parameters up front — before QKD_TRANSMISSION.TRANSMISSION_STARTED
// reports the *effective* (backend-defaulted) values actually used.
export interface AuthenticateSessionStartedPayload {
  mode: "AUTHENTICATE";
  distance_km: number;
  eavesdropper_present: boolean;
}
export type SessionStartedPayload = EnrollSessionStartedPayload | AuthenticateSessionStartedPayload;

// The backend emits SESSION_COMPLETED payload fields flat (not nested
// under a "summary" key as the spec's table shorthand suggests) — shape
// varies by mode, so this is a union of the two real shapes.
export interface EnrollCompletedPayload {
  user_id: string;
  user_name: string;
  user_email: string;
  public_key_fingerprint: string;
}
export interface AuthenticateCompletedPayload {
  user_id: string;
  estimated_qber: number;
  final_key_bits: number;
}
export type SessionCompletedPayload = EnrollCompletedPayload | AuthenticateCompletedPayload;

export interface SessionFailedPayload {
  failure_code?: FailureCode;
  failed_at_phase?: Phase | string;
  // v3: present on AUTHENTICATE-mode failures.
  eavesdropper_present?: boolean;
}

export interface TerminalRequestSentPayload {
  terminal_id: string;
}
export interface ServerResponseVerifiedSuccessPayload {
  mutual_auth_session_id: string;
}
export interface ServerResponseVerifiedFailurePayload {
  failure_code: FailureCode;
  failure_message: string;
}

export interface IrisCaptureStartedPayload {
  [key: string]: never;
}
export interface EnrollmentIrisCaptureCompletePayload {
  code_length_bits: number;
}
export interface FuzzyCommitmentCreatedPayload {
  helper_data_fingerprint: string;
}
export interface UserKeypairDerivedPayload {
  public_key_fingerprint: string;
}
export interface ServerRecordStoredPayload {
  user_id: string;
}
// v2: the server never retains the raw iris code — this event is the one
// and only place it's ever transmitted, immediately after enrollment
// completes server-side. The frontend must surface it prominently and
// let the user (not the browser) be its custodian.
export interface IrisCodeIssuedPayload {
  iris_code: string;
  iris_fingerprint: string;
  warning: string;
}

export interface UserLookupPayload {
  user_found: boolean;
}
export interface UserAuthIrisCaptureCompletePayload {
  quality_score: number;
}
export interface KeyReconstructedPayload {
  reconstruction_attempts: number;
  failure_code?: FailureCode;
}
export interface LocalSignatureVerifiedPayload {
  verified: boolean;
}

export interface TokenIssuedPayload {
  expires_in_seconds: number;
}
export interface TokenVerifiedPayload {
  verified: boolean;
}

// v3: the 8 tunable QKD parameters from GET /qkd-config/defaults, also the
// shape of the *effective* (backend-resolved) configuration echoed back on
// TRANSMISSION_STARTED — resolved even when the user never touched the
// config panel, since the backend fills in its own defaults either way.
export interface QkdRunConfiguration {
  z_basis_probability: number;
  parameter_estimation_fraction: number;
  qber_abort_threshold: number;
  security_margin_bits: number;
  reconciliation_passes: number;
  target_detected_events: number;
  transmission_batch_size: number;
  maximum_qkd_attempts: number;
}
// A client may send any subset of these — omitted keys fall back to the
// backend's own default for that key.
export type QkdRunConfigurationOverrides = Partial<QkdRunConfiguration>;

export interface TransmissionStartedPayload {
  signal_count: number;
  z_basis_probability: number;
  x_basis_probability: number;
  distance_km: number;
  eavesdropper_present: boolean;
  configuration: QkdRunConfiguration;
}
export interface TransmissionCompletePayload {
  signal_count: number;
  attempt_number: number;
  cumulative_transmitted_pulses: number;
  modelled_qkd_session_seconds: number;
}

export interface BasisComparisonPayload {
  sifted_length: number;
  observed_match_rate: number;
}

export interface QberEstimatedPayload {
  estimated_qber: number;
  sample_size: number;
  accepted: boolean;
  threshold: number;
  // v3: present on FAILURE — distinguishes a real detected intercept-resend
  // attack (failure_code "EAVESDROPPER_DETECTED") from ordinary channel
  // noise crossing the threshold (failure_code "QBER_THRESHOLD_EXCEEDED").
  eavesdropper_present?: boolean;
  failure_code?: FailureCode;
}
export interface QberEstimationFailedPayload {
  failure_code: FailureCode;
  failure_message: string;
}

export interface CascadeRoundPayload {
  round_number: number;
  errors_corrected_this_round: number;
}
export interface ReconciliationCompletePayload {
  total_rounds: number;
  total_errors_corrected: number;
  leakage_bits: number;
}

export interface AmplificationCompletePayload {
  input_length_bits: number;
  output_length_bits: number;
  entropy_loss_bits: number;
}

export interface HkdfCompletePayload {
  derived_key_names: string[];
}
export interface ConfirmationVerifiedPayload {
  verified: boolean;
}

// v4: only present when the authenticate command was sent with
// reveal_secrets: true — an opt-in, instructional-only demo mode. This is
// the ONE place raw derived key material is ever transmitted to the
// frontend; it must never be inferred or surfaced through any other path.
export interface RevealedSecretKeys {
  terminal_to_server_key_hex: string;
  server_to_terminal_key_hex: string;
  terminal_to_server_nonce_base_hex: string;
  server_to_terminal_nonce_base_hex: string;
  confirmation_key_hex: string;
}
export interface RawSecretsRevealedPayload {
  warning: string;
  qkd_raw_secret_hex: string;
  qkd_raw_secret_bits: number;
  keys: RevealedSecretKeys;
}

export interface ChannelEstablishedPayload {
  cipher: string;
}
// v2: both message events now carry the real AES-GCM material, not just
// metadata — the point being to actually show the ciphertext, not merely
// assert that encryption happened.
export interface MessageSentPayload {
  direction: "T->S" | "S->T";
  sequence_number: number;
  plaintext: string;
  nonce_b64: string;
  ciphertext_b64: string;
  associated_data_b64: string;
}
export interface MessageSentFailurePayload {
  failure_code: "NO_ACTIVE_CHANNEL";
}
export interface MessageDecryptedPayload {
  direction: "T->S" | "S->T";
  sequence_number: number;
  plaintext: string;
  verified: boolean;
}

// Discriminated union of every known (phase, step, status) combination in
// the Section 3.4 catalog, typed against the real backend payload shapes.
export type ProtocolEvent =
  | (EventBase & { phase: "SESSION"; step: "SESSION_STARTED"; status: "STARTED"; payload: SessionStartedPayload })
  | (EventBase & { phase: "SESSION"; step: "SESSION_COMPLETED"; status: "SUCCESS"; payload: SessionCompletedPayload })
  | (EventBase & { phase: "SESSION"; step: "SESSION_FAILED"; status: "FAILURE"; payload: SessionFailedPayload })
  | (EventBase & { phase: "MUTUAL_AUTH"; step: "TERMINAL_REQUEST_SENT"; status: "STARTED"; payload: TerminalRequestSentPayload })
  | (EventBase & { phase: "MUTUAL_AUTH"; step: "SERVER_RESPONSE_VERIFIED"; status: "SUCCESS"; payload: ServerResponseVerifiedSuccessPayload })
  | (EventBase & { phase: "MUTUAL_AUTH"; step: "SERVER_RESPONSE_VERIFIED"; status: "FAILURE"; payload: ServerResponseVerifiedFailurePayload })
  | (EventBase & { phase: "ENROLLMENT"; step: "IRIS_CAPTURE_STARTED"; status: "STARTED"; payload: IrisCaptureStartedPayload })
  | (EventBase & { phase: "ENROLLMENT"; step: "IRIS_CAPTURE_COMPLETE"; status: "SUCCESS"; payload: EnrollmentIrisCaptureCompletePayload })
  | (EventBase & { phase: "ENROLLMENT"; step: "FUZZY_COMMITMENT_CREATED"; status: "SUCCESS"; payload: FuzzyCommitmentCreatedPayload })
  | (EventBase & { phase: "ENROLLMENT"; step: "USER_KEYPAIR_DERIVED"; status: "SUCCESS"; payload: UserKeypairDerivedPayload })
  | (EventBase & { phase: "ENROLLMENT"; step: "SERVER_RECORD_STORED"; status: "SUCCESS" | "FAILURE"; payload: ServerRecordStoredPayload | SessionFailedPayload })
  | (EventBase & { phase: "ENROLLMENT"; step: "IRIS_CODE_ISSUED"; status: "SUCCESS"; payload: IrisCodeIssuedPayload })
  | (EventBase & { phase: "USER_AUTH"; step: "USER_LOOKUP"; status: "SUCCESS" | "FAILURE"; payload: UserLookupPayload })
  | (EventBase & { phase: "USER_AUTH"; step: "IRIS_CAPTURE_COMPLETE"; status: "STARTED"; payload: Record<string, never> })
  | (EventBase & { phase: "USER_AUTH"; step: "IRIS_CAPTURE_COMPLETE"; status: "SUCCESS"; payload: UserAuthIrisCaptureCompletePayload })
  | (EventBase & { phase: "USER_AUTH"; step: "KEY_RECONSTRUCTION_ATTEMPT"; status: "PROGRESS"; payload: Record<string, never> })
  | (EventBase & { phase: "USER_AUTH"; step: "KEY_RECONSTRUCTED"; status: "SUCCESS" | "FAILURE"; payload: KeyReconstructedPayload })
  | (EventBase & { phase: "USER_AUTH"; step: "LOCAL_SIGNATURE_VERIFIED"; status: "SUCCESS" | "FAILURE"; payload: LocalSignatureVerifiedPayload })
  | (EventBase & { phase: "QAUTH_TOKEN"; step: "TOKEN_ISSUED"; status: "SUCCESS"; payload: TokenIssuedPayload })
  | (EventBase & { phase: "QAUTH_TOKEN"; step: "TOKEN_VERIFIED_BY_SERVER"; status: "SUCCESS" | "FAILURE"; payload: TokenVerifiedPayload })
  | (EventBase & { phase: "QKD_TRANSMISSION"; step: "TRANSMISSION_STARTED"; status: "STARTED"; payload: TransmissionStartedPayload })
  | (EventBase & { phase: "QKD_TRANSMISSION"; step: "TRANSMISSION_COMPLETE"; status: "SUCCESS"; payload: TransmissionCompletePayload })
  | (EventBase & { phase: "QKD_SIFTING"; step: "BASIS_COMPARISON"; status: "SUCCESS"; payload: BasisComparisonPayload })
  | (EventBase & { phase: "QKD_PARAMETER_ESTIMATION"; step: "QBER_ESTIMATED"; status: "SUCCESS"; payload: QberEstimatedPayload })
  | (EventBase & { phase: "QKD_PARAMETER_ESTIMATION"; step: "QBER_ESTIMATED"; status: "FAILURE"; payload: QberEstimatedPayload | QberEstimationFailedPayload })
  | (EventBase & { phase: "QKD_RECONCILIATION"; step: "CASCADE_ROUND"; status: "PROGRESS"; payload: CascadeRoundPayload })
  | (EventBase & { phase: "QKD_RECONCILIATION"; step: "RECONCILIATION_COMPLETE"; status: "SUCCESS" | "FAILURE"; payload: ReconciliationCompletePayload })
  | (EventBase & { phase: "QKD_PRIVACY_AMPLIFICATION"; step: "AMPLIFICATION_COMPLETE"; status: "SUCCESS"; payload: AmplificationCompletePayload })
  | (EventBase & { phase: "KEY_DERIVATION"; step: "HKDF_COMPLETE"; status: "SUCCESS"; payload: HkdfCompletePayload })
  | (EventBase & { phase: "KEY_DERIVATION"; step: "CONFIRMATION_VERIFIED"; status: "SUCCESS" | "FAILURE"; payload: ConfirmationVerifiedPayload })
  | (EventBase & { phase: "KEY_DERIVATION"; step: "RAW_SECRETS_REVEALED"; status: "SUCCESS"; payload: RawSecretsRevealedPayload })
  | (EventBase & { phase: "AES_CHANNEL"; step: "CHANNEL_ESTABLISHED"; status: "SUCCESS"; payload: ChannelEstablishedPayload })
  | (EventBase & { phase: "AES_CHANNEL"; step: "MESSAGE_SENT"; status: "SUCCESS"; payload: MessageSentPayload })
  | (EventBase & { phase: "AES_CHANNEL"; step: "MESSAGE_SENT"; status: "FAILURE"; payload: MessageSentFailurePayload })
  | (EventBase & { phase: "AES_CHANNEL"; step: "MESSAGE_DECRYPTED"; status: "SUCCESS" | "FAILURE"; payload: MessageDecryptedPayload })
  // Fallback: any future/unrecognized phase+step+status combo. Keeps the
  // union open so the app degrades gracefully instead of crashing on an
  // unexpected server payload (e.g. a step this spec version doesn't list).
  | (EventBase & { phase: Phase; step: string; status: EventStatus; payload: Record<string, unknown> });

// Frontend-only status: "no event for this phase yet this session." Never
// sent by the backend; it's the default before any event arrives and what
// SESSION_STARTED resets every phase back to.
export type PhaseStatus = "IDLE" | EventStatus;

export interface PhaseState {
  [phase: string]: {
    latestEvent: ProtocolEvent;
    status: PhaseStatus;
  };
}

export const ALL_PHASES: Phase[] = [
  "SESSION",
  "MUTUAL_AUTH",
  "ENROLLMENT",
  "USER_AUTH",
  "QAUTH_TOKEN",
  "QKD_TRANSMISSION",
  "QKD_SIFTING",
  "QKD_PARAMETER_ESTIMATION",
  "QKD_RECONCILIATION",
  "QKD_PRIVACY_AMPLIFICATION",
  "KEY_DERIVATION",
  "AES_CHANNEL",
];

// Phases whose visual state is carried by the Terminal<->Server edge.
export const TERMINAL_SERVER_PHASES: Phase[] = [
  "MUTUAL_AUTH",
  "QAUTH_TOKEN",
  "QKD_TRANSMISSION",
  "QKD_SIFTING",
  "QKD_PARAMETER_ESTIMATION",
  "QKD_RECONCILIATION",
  "QKD_PRIVACY_AMPLIFICATION",
  "KEY_DERIVATION",
  "AES_CHANNEL",
];

// Phases whose visual state is carried by the Terminal<->User edge.
export const TERMINAL_USER_PHASES: Phase[] = ["ENROLLMENT", "USER_AUTH"];

export interface EnrollCommand {
  action: "enroll";
  name: string;
  email: string;
}
export interface AuthenticateCommand {
  action: "authenticate";
  email: string;
  // v2: the backend no longer stores raw iris codes or applies scan noise
  // on the user's behalf — the client must supply the iris code it wants
  // verified. bit_error_rate/rotation_bits are gone from this command;
  // noise simulation is now the separate, explicit
  // POST /demo/simulate-scan-noise step (see SimulateScanNoiseRequest).
  iris_code: string;
  // v3: any subset of the 8 GET /qkd-config/defaults keys. Only include
  // this field at all if the user actually touched the config panel —
  // omit it entirely to let the backend use its own defaults throughout,
  // rather than sending a full object of unchanged defaults back at it.
  configuration?: QkdRunConfigurationOverrides;
  // v3: default 5.0 on the backend if omitted.
  distance_km?: number;
  // v3: now a real, backend-wired intercept-resend attack simulation —
  // detected via a genuine QBER spike, not a scripted failure.
  eavesdropper_present?: boolean;
  // v4: opt-in, instructional-demo-only. Must only ever be included as
  // `true` when the user has explicitly enabled it for this run — never a
  // standing preference, and omitted entirely (not sent as false) otherwise.
  reveal_secrets?: boolean;
}
export interface SendMessageCommand {
  action: "send_message";
  direction: "T->S" | "S->T";
  text: string;
  // v2: when true, the backend simulates a live reply on the opposite
  // direction immediately after decrypting this message.
  auto_reply?: boolean;
}
export type ProtocolCommand = EnrollCommand | AuthenticateCommand | SendMessageCommand;

// v2: POST /demo/simulate-scan-noise — client-triggered, explicit scan-noise
// simulation. Replaces the old bit_error_rate/rotation_bits fields that used
// to ride along on the authenticate command.
export interface SimulateScanNoiseRequest {
  iris_code: string;
  bit_error_rate?: number;
  rotation_bits?: number;
}
export interface SimulateScanNoiseResponse {
  noisy_iris_code: string;
  actual_bit_error_rate: number;
  changed_bits: number;
  applied_rotation_bits: number;
}

// v3: GET /qkd-config/defaults — the source of truth for what's tunable.
// Labels/units/descriptions must be rendered from this response, not
// hardcoded, so the UI stays correct if the backend adds/renames a param.
export interface QkdConfigParameterInfo {
  key: string;
  label: string;
  unit: string;
  description: string;
  default: number;
}
export interface QkdConfigDefaultsResponse {
  parameters: QkdConfigParameterInfo[];
  default_distance_km: number;
}

// v3: qber_abort_threshold and default_signal_count were removed from this
// response — they're per-run configurable now (see QkdRunConfiguration /
// GET /qkd-config/defaults) rather than fixed protocol constants.
export interface SystemInfo {
  protocol_name: string;
  protocol_version: string;
  signature_algorithm: string;
  iris_code_length_bits: number;
  aes_algorithm: string;
  kdf: string;
  terminal_id: string;
  server_id: string;
}

export interface HealthResponse {
  status: "ok";
  protocol: string;
  version: string;
}

export interface UsersResponse {
  enrolled_count: number;
  user_ids: string[];
}
