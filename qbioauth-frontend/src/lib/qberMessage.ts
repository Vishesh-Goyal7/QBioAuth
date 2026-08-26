// The backend's except-AuthenticationFailure handler for an eavesdropper-
// triggered QBER abort (execute_phase_5_qkd_session in the notebook) never
// attaches the real numbers to the emitted QBER_ESTIMATED FAILURE payload —
// only `failure_code`/`failure_message`/`eavesdropper_present`. The actual
// values only survive as text inside failure_message, e.g. "QKD session
// aborted because estimated QBER 18.42% exceeded threshold 11.00%." This
// pulls them back out as a fallback for whenever the structured
// estimated_qber/threshold fields are absent.
const QBER_MESSAGE_PATTERN = /estimated QBER\s+([\d.]+)%\s+exceeded threshold\s+([\d.]+)%/i;

export function parseQberFromFailureMessage(message: string | undefined): {
  estimatedQberPercent: number | null;
  thresholdPercent: number | null;
} {
  const match = message?.match(QBER_MESSAGE_PATTERN);
  if (!match) return { estimatedQberPercent: null, thresholdPercent: null };
  return {
    estimatedQberPercent: Number(match[1]),
    thresholdPercent: Number(match[2]),
  };
}
