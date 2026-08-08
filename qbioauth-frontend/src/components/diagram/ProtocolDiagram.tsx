import { useMemo } from "react";
import { ReactFlow, Background, BackgroundVariant, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import TerminalNode from "./TerminalNode";
import ServerNode from "./ServerNode";
import UserNode from "./UserNode";
import ProtocolEdge, { type ProtocolEdgeData } from "./ProtocolEdge";
import { useProtocolStore } from "../../store/protocolStore";
import { computeEdgeVisualState } from "../../lib/edgeVisualState";
import { TERMINAL_SERVER_PHASES, TERMINAL_USER_PHASES } from "../../types/protocol";

const nodeTypes = {
  terminal: TerminalNode,
  server: ServerNode,
  user: UserNode,
};

const edgeTypes = {
  protocol: ProtocolEdge,
};

const NODES: Node[] = [
  { id: "terminal", type: "terminal", position: { x: 40, y: 140 }, data: {}, draggable: false, selectable: false },
  { id: "server", type: "server", position: { x: 560, y: 140 }, data: {}, draggable: false, selectable: false },
  { id: "user", type: "user", position: { x: 300, y: 380 }, data: {}, draggable: false, selectable: false },
];

export default function ProtocolDiagram() {
  const phaseState = useProtocolStore((s) => s.phaseState);
  const mode = useProtocolStore((s) => s.mode);
  const lastFailure = useProtocolStore((s) => s.lastFailure);

  const edges: Edge[] = useMemo(() => {
    const tsVisual = computeEdgeVisualState(phaseState, TERMINAL_SERVER_PHASES, "AES_CHANNEL", lastFailure);
    const tuVisual = computeEdgeVisualState(
      phaseState,
      TERMINAL_USER_PHASES,
      mode === "ENROLL" ? "ENROLLMENT" : null,
      lastFailure,
    );

    return [
      {
        id: "edge-terminal-server",
        source: "terminal",
        sourceHandle: "right",
        target: "server",
        targetHandle: "left",
        type: "protocol",
        animated: tsVisual.kind === "ACTIVE",
        data: { visualState: tsVisual } satisfies ProtocolEdgeData,
      },
      {
        id: "edge-terminal-user",
        source: "terminal",
        sourceHandle: "bottom",
        target: "user",
        targetHandle: "top",
        type: "protocol",
        animated: tuVisual.kind === "ACTIVE",
        data: { visualState: tuVisual } satisfies ProtocolEdgeData,
      },
    ];
  }, [phaseState, mode, lastFailure]);

  return (
    <div className="h-full w-full rounded-lg border border-panelborder bg-[#0d1320]">
      <ReactFlow
        nodes={NODES}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1f2937" />
      </ReactFlow>
    </div>
  );
}
