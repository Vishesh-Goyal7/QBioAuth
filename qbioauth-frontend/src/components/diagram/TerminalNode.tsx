import { Handle, Position } from "@xyflow/react";
import { useProtocolStore } from "../../store/protocolStore";

export default function TerminalNode() {
  const active = useProtocolStore((s) => s.terminalNodeActive);

  return (
    <div
      className={`flex h-20 w-32 flex-col items-center justify-center rounded-lg border-2 bg-panel text-center transition-colors ${
        active ? "border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.5)]" : "border-panelborder"
      }`}
    >
      <span
        className={`mb-1 h-2 w-2 rounded-full ${active ? "animate-pulse bg-amber-400" : "bg-gray-600"}`}
      />
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Terminal</span>
      <span className="text-[10px] text-gray-500">device</span>
      <Handle type="source" position={Position.Right} id="right" className="!bg-gray-500" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-gray-500" />
    </div>
  );
}
