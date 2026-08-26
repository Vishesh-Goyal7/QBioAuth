import { useProtocolStore } from "../../store/protocolStore";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { parseQberFromFailureMessage } from "../../lib/qberMessage";

export default function MetricCards() {
  const qberEntry = useProtocolStore((s) => s.phaseState.QKD_PARAMETER_ESTIMATION);
  const amplificationEntry = useProtocolStore((s) => s.phaseState.QKD_PRIVACY_AMPLIFICATION);
  const lastFailure = useProtocolStore((s) => s.lastFailure);

  const qberPayload = qberEntry?.latestEvent.payload as
    | { estimated_qber?: number; threshold?: number; failure_message?: string }
    | undefined;
  const isQberFailure = qberEntry?.status === "FAILURE";
  const isAttack = isQberFailure && lastFailure?.code === "EAVESDROPPER_DETECTED";
  // An eavesdropper-triggered abort never carries structured estimated_qber/
  // threshold fields (see lib/qberMessage.ts) — fall back to parsing them
  // out of failure_message so the real numbers still show instead of "—".
  const parsedFromMessage = parseQberFromFailureMessage(qberPayload?.failure_message);
  const qberValue =
    qberPayload?.estimated_qber ??
    (parsedFromMessage.estimatedQberPercent != null ? parsedFromMessage.estimatedQberPercent / 100 : undefined);
  const thresholdValue =
    qberPayload?.threshold ??
    (parsedFromMessage.thresholdPercent != null ? parsedFromMessage.thresholdPercent / 100 : undefined);

  const paPayload = amplificationEntry?.latestEvent.payload as
    | { input_length_bits?: number; output_length_bits?: number }
    | undefined;
  const outputBits = paPayload?.output_length_bits ?? 0;
  const animatedBits = useAnimatedNumber(outputBits, 800);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div
        className={`rounded-lg border p-4 transition-colors ${
          isAttack
            ? "border-2 border-rose-400 bg-rose-950 shadow-[0_0_16px_rgba(225,29,72,0.5)]"
            : isQberFailure
              ? "border-red-700 bg-red-950/40"
              : "border-panelborder bg-panel"
        }`}
      >
        <div className="text-xs uppercase tracking-wide text-gray-500">QBER</div>
        <div
          className={`mt-1 text-2xl font-semibold ${
            isAttack ? "text-rose-200" : isQberFailure ? "text-red-300" : "text-gray-100"
          }`}
        >
          {qberValue != null ? `${(qberValue * 100).toFixed(2)}%` : "—"}
        </div>
        {isQberFailure ? (
          <>
            <div className={`mt-1 text-xs font-semibold ${isAttack ? "text-rose-300" : "text-red-400"}`}>
              {isAttack ? "🚨 EAVESDROPPER DETECTED" : "Possible eavesdropper detected"}
            </div>
            {qberValue != null && thresholdValue != null && (
              <div className="mt-1 text-xs text-gray-500">
                {(qberValue * 100).toFixed(2)}% vs threshold {(thresholdValue * 100).toFixed(1)}%
              </div>
            )}
          </>
        ) : (
          thresholdValue != null && (
            <div className="mt-1 text-xs text-gray-500">threshold {(thresholdValue * 100).toFixed(1)}%</div>
          )
        )}
      </div>

      <div className="rounded-lg border border-panelborder bg-panel p-4">
        <div className="text-xs uppercase tracking-wide text-gray-500">Key size</div>
        <div className="mt-1 text-2xl font-semibold text-gray-100">
          {outputBits ? `${Math.round(animatedBits)} bits` : "—"}
        </div>
        {paPayload?.input_length_bits != null && (
          <div className="mt-1 text-xs text-gray-500">from {paPayload.input_length_bits} bits</div>
        )}
      </div>
    </div>
  );
}
