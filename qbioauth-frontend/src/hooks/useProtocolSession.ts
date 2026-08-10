import { useCallback, useEffect, useRef } from "react";
import { openProtocolSocket, type ProtocolSocketHandle } from "../lib/protocolSocket";
import { useProtocolStore } from "../store/protocolStore";

export interface StartAuthenticateParams {
  email: string;
  // v2: required — the backend no longer stores raw iris codes or applies
  // scan noise on the user's behalf, so the caller must supply exactly
  // what it wants verified.
  iris_code: string;
  eavesdropper_present?: boolean;
  // v4: opt-in instructional demo mode — see StartAuthenticateParams caller
  // (ControlBar), which reads this fresh from the store at submit time and
  // resets it immediately after so it never carries over to the next run.
  reveal_secrets?: boolean;
}

// Owns the single active WebSocket for the app. protocolSocket.close()
// nulls its own handlers before calling socket.close(), so an
// intentionally-closed socket never fires onClose — only a real
// network drop does. That's what lets us treat every onClose here as
// "unexpected" without extra bookkeeping.
export function useProtocolSession() {
  const socketRef = useRef<ProtocolSocketHandle | null>(null);

  const wsBaseUrl = useProtocolStore((s) => s.wsBaseUrl);
  const sessionId = useProtocolStore((s) => s.sessionId);
  const startNewSession = useProtocolStore((s) => s.startNewSession);
  const setCurrentRunEmail = useProtocolStore((s) => s.setCurrentRunEmail);
  const ingestEvent = useProtocolStore((s) => s.ingestEvent);
  const setConnectionStatus = useProtocolStore((s) => s.setConnectionStatus);
  const pushOptimisticChatMessage = useProtocolStore((s) => s.pushOptimisticChatMessage);

  const closeCurrentSocket = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  const openSocketForSession = useCallback(
    (targetSessionId: string, onOpen?: () => void) => {
      if (!wsBaseUrl) return;
      closeCurrentSocket();
      setConnectionStatus("CONNECTING");
      socketRef.current = openProtocolSocket(wsBaseUrl, targetSessionId, {
        onOpen: () => {
          setConnectionStatus("CONNECTED");
          onOpen?.();
        },
        onEvent: (event) => ingestEvent(event),
        onClose: () => setConnectionStatus("ERROR"),
        onError: () => setConnectionStatus("ERROR"),
      });
    },
    [wsBaseUrl, closeCurrentSocket, ingestEvent, setConnectionStatus],
  );

  const startEnroll = useCallback(
    (name: string, email: string) => {
      const newSessionId = startNewSession("ENROLL");
      setCurrentRunEmail(email);
      openSocketForSession(newSessionId, () => {
        socketRef.current?.send({ action: "enroll", name, email });
      });
    },
    [startNewSession, setCurrentRunEmail, openSocketForSession],
  );

  const startAuthenticate = useCallback(
    (params: StartAuthenticateParams) => {
      const newSessionId = startNewSession("AUTHENTICATE");
      setCurrentRunEmail(params.email);
      openSocketForSession(newSessionId, () => {
        socketRef.current?.send({ action: "authenticate", ...params });
      });
    },
    [startNewSession, setCurrentRunEmail, openSocketForSession],
  );

  const sendChatMessage = useCallback(
    (direction: "T->S" | "S->T", text: string, autoReply?: boolean) => {
      pushOptimisticChatMessage(direction, text);
      socketRef.current?.send({ action: "send_message", direction, text, auto_reply: autoReply });
    },
    [pushOptimisticChatMessage],
  );

  // Manual reconnect after a drop: reopens a socket bound to the same
  // session_id (the backend keys the live AES session by session_id),
  // but does not re-send enroll/authenticate — a dropped mid-flow run
  // can't be resumed, only send_message follow-ups make sense here.
  const reconnect = useCallback(() => {
    if (!sessionId) return;
    openSocketForSession(sessionId);
  }, [sessionId, openSocketForSession]);

  useEffect(() => closeCurrentSocket, [closeCurrentSocket]);

  return { startEnroll, startAuthenticate, sendChatMessage, reconnect };
}
