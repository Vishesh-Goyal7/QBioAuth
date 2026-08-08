import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import type { EdgeVisualState } from "../../lib/edgeVisualState";

export interface ProtocolEdgeData extends Record<string, unknown> {
  visualState: EdgeVisualState;
}

const STROKE_BY_KIND: Record<EdgeVisualState["kind"], string> = {
  IDLE: "#374151",
  ACTIVE: "#f59e0b",
  INTERMEDIATE_SUCCESS: "#3b82f6",
  FINAL_SUCCESS: "#22c55e",
  FAILURE: "#ef4444",
  ATTACK_DETECTED: "#e11d48",
};

const WIDTH_BY_KIND: Record<EdgeVisualState["kind"], number> = {
  IDLE: 1.5,
  ACTIVE: 2.5,
  INTERMEDIATE_SUCCESS: 2.5,
  FINAL_SUCCESS: 3,
  FAILURE: 3,
  ATTACK_DETECTED: 4,
};

const LABEL_CLASS_BY_KIND: Record<EdgeVisualState["kind"], string> = {
  IDLE: "bg-gray-800 text-gray-400",
  ACTIVE: "bg-amber-950 text-amber-300 border border-amber-700",
  INTERMEDIATE_SUCCESS: "bg-blue-950 text-blue-300 border border-blue-700",
  FINAL_SUCCESS: "bg-emerald-950 text-emerald-300 border border-emerald-700",
  FAILURE: "bg-red-950 text-red-300 border border-red-700",
  ATTACK_DETECTED: "bg-rose-600 text-white border-2 border-rose-300 animate-pulse font-bold",
};

export default function ProtocolEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const visualState = (data as ProtocolEdgeData | undefined)?.visualState ?? { kind: "IDLE" as const };

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{ stroke: STROKE_BY_KIND[visualState.kind], strokeWidth: WIDTH_BY_KIND[visualState.kind] }}
        className={
          visualState.kind === "ATTACK_DETECTED"
            ? "qbio-edge-attack"
            : visualState.kind === "FAILURE"
              ? "qbio-edge-failure"
              : undefined
        }
      />
      {visualState.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
            }}
            className={`whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-medium ${LABEL_CLASS_BY_KIND[visualState.kind]}`}
          >
            {visualState.kind === "FINAL_SUCCESS" ? "🔒 " : ""}
            {visualState.kind === "ATTACK_DETECTED" ? "🚨 " : ""}
            {visualState.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
