import { useEffect, useRef, useState } from "react";
import {
  ConnectionState,
  RealtimeEvent,
  connectSocket,
  disconnectSocket,
  onConnectionStateChange,
  subscribeRealtime,
} from "./socketClient";

/**
 * STOMP 구독 + 연결 상태를 관리하는 훅.
 * destination이 null이면 구독하지 않는다 (로그인 전 등).
 */
export function useRealtimeChannel(
  destination: string | null,
  onEvent: (event: RealtimeEvent) => void
): ConnectionState {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!destination) return;

    connectSocket();
    const unsubscribeState = onConnectionStateChange(setConnectionState);
    const unsubscribeChannel = subscribeRealtime(destination, (event) => onEventRef.current(event));

    return () => {
      unsubscribeChannel();
      unsubscribeState();
      disconnectSocket();
    };
  }, [destination]);

  return connectionState;
}

/** 웹소켓이 끊겼을 때만 보조로 폴링하기 위한 간단한 헬퍼. */
export function isRealtimeDown(state: ConnectionState): boolean {
  return state !== "connected";
}
