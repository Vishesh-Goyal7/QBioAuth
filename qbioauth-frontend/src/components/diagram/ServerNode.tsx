import { Handle, Position } from "@xyflow/react";
import { useProtocolStore } from "../../store/protocolStore";

export default function ServerNode() {
  const active = useProtocolStore((s) => s.serverNodeActive);

  return (
    <div
      className={`flex h-20 w-32 flex-col items-center justify-center rounded-lg border-2 bg-panel text-center transition-colors ${
        active ? "border-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.5)]" : "border-panelborder"
      }`}
    >
      <span
        className={`mb-1 h-2 w-2 rounded-full ${active ? "animate-pulse bg-sky-400" : "bg-gray-600"}`}
      />
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Server</span>
      <span className="text-[10px] text-gray-500">QBioAuth backend</span>
      <Handle type="target" position={Position.Left} id="left" className="!bg-gray-500" />
    </div>
  );
}
