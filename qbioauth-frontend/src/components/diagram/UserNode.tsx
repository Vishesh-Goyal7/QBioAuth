import { Handle, Position } from "@xyflow/react";
import { useProtocolStore } from "../../store/protocolStore";

export default function UserNode() {
  const active = useProtocolStore((s) => s.userNodeActive);

  return (
    <div
      className={`flex h-20 w-32 flex-col items-center justify-center rounded-full border-2 bg-panel text-center transition-colors ${
        active ? "border-violet-400 shadow-[0_0_16px_rgba(167,139,250,0.5)]" : "border-panelborder"
      }`}
    >
      <span
        className={`mb-1 h-2 w-2 rounded-full ${active ? "animate-pulse bg-violet-400" : "bg-gray-600"}`}
      />
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">User</span>
      <span className="text-[10px] text-gray-500">iris biometric</span>
      <Handle type="target" position={Position.Top} id="top" className="!bg-gray-500" />
    </div>
  );
}
