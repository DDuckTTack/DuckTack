import { apiClient } from "./apiClient";
import { parseMessageTimestamp } from "./message";

export type SupportStatus = "PENDING" | "ANSWERED";
export type SenderRole = "USER" | "ADMIN";

export type SupportThread = {
  threadId: number;
  status: SupportStatus;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export type SupportMessageItem = {
  id: number;
  threadId: number;
  senderId: number;
  senderUsername: string;
  senderRole: SenderRole;
  mine: boolean;
  content: string;
  createdAt: string | null;
};

function unwrapData<T>(raw: any): T {
  return raw?.data ?? raw;
}

export { parseMessageTimestamp };

export async function getOrCreateThread(): Promise<SupportThread> {
  const res = await apiClient.get("/api/support/thread");
  return unwrapData<SupportThread>(res.data);
}

export async function listMessages(
    params: { afterId?: number; page?: number; size?: number } = {}
): Promise<SupportMessageItem[]> {
  const res = await apiClient.get("/api/support/thread/messages", {
    params: params.afterId
        ? { afterId: params.afterId }
        : { page: params.page ?? 0, size: params.size ?? 30 },
  });
  const data = unwrapData<any>(res.data);
  return Array.isArray(data) ? data : [];
}

export async function sendMessage(content: string): Promise<SupportMessageItem> {
  const res = await apiClient.post("/api/support/thread/messages", { content });
  return unwrapData<SupportMessageItem>(res.data);
}
