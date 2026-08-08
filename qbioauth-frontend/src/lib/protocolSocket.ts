import type { ProtocolCommand, ProtocolEvent } from "../types/protocol";

export interface ProtocolSocketHandlers {
  onOpen?: () => void;
  onEvent: (event: ProtocolEvent) => void;
  onClose?: (info: { code: number; wasClean: boolean }) => void;
  onError?: () => void;
}

export interface ProtocolSocketHandle {
  send: (command: ProtocolCommand) => void;
  close: () => void;
}

// Thin wrapper around the raw WebSocket for a single session_id. One
// session run = one socket; the caller (useProtocolSession) owns the
// lifecycle and never multiplexes multiple runs over one instance.
export function openProtocolSocket(
  wsBaseUrl: string,
  sessionId: string,
  handlers: ProtocolSocketHandlers,
): ProtocolSocketHandle {
  const socket = new WebSocket(`${wsBaseUrl}/ws/session/${sessionId}`);

  socket.onopen = () => handlers.onOpen?.();

  socket.onmessage = (evt) => {
    try {
      const parsed = JSON.parse(evt.data) as ProtocolEvent;
      handlers.onEvent(parsed);
    } catch {
      // Non-JSON frame from the server — ignore rather than crash the run.
    }
  };

  socket.onclose = (evt) => handlers.onClose?.({ code: evt.code, wasClean: evt.wasClean });
  socket.onerror = () => handlers.onError?.();

  return {
    send: (command: ProtocolCommand) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(command));
      }
    },
    close: () => {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    },
  };
}
