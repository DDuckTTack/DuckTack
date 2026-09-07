import { apiClient } from "./apiClient";

export type ConversationType = "USER" | "COMPANY";

export type ReportReason =
    | "SPAM"
    | "ABUSE"
    | "ADVERTISEMENT"
    | "FALSE_INFORMATION"
    | "PERSONAL_INFORMATION"
    | "OTHER";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "스팸/도배",
  ABUSE: "욕설/비방",
  ADVERTISEMENT: "광고성 메시지",
  FALSE_INFORMATION: "허위 정보",
  PERSONAL_INFORMATION: "개인정보 노출",
  OTHER: "기타",
};

export const REPORT_REASON_ORDER: ReportReason[] = [
  "SPAM",
  "ABUSE",
  "ADVERTISEMENT",
  "FALSE_INFORMATION",
  "PERSONAL_INFORMATION",
  "OTHER",
];

export type ConversationItem = {
  conversationId: number;
  otherUserId: number;
  otherUsername: string;
  otherIsCompany: boolean;
  otherDisplayName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export type ConversationPage = {
  content: ConversationItem[];
  totalPages: number;
  totalElements: number;
  last: boolean;
  number: number;
};

export type MessageItem = {
  id: number;
  conversationId: number;
  senderId: number;
  senderUsername: string;
  mine: boolean;
  content: string;
  createdAt: string | null;
};

export type ReservedCompanyItem = {
  companyId: number;
  companyName: string;
  address: string | null;
  phone: string | null;
  latestReservationId: number;
  latestReservationStatus: string;
  latestVisitDate: string | null;
};

function unwrapData<T>(raw: any): T {
  return raw?.data ?? raw;
}

// 백엔드가 OffsetDateTime을 문서상 ISO 문자열이 아니라 epoch seconds(소수 나노초 포함)로
// 내려주는 경우가 있어, 숫자/문자열 두 형태를 모두 처리한다. (company-web과 동일 처리)
export function parseMessageTimestamp(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const date = new Date(typeof value === "number" ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function listConversations(params: {
  type?: ConversationType;
  page?: number;
  size?: number;
}): Promise<ConversationPage> {
  const res = await apiClient.get("/api/messages/conversations", {
    params: {
      type: params.type,
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  });

  const page = unwrapData<any>(res.data);

  return {
    content: Array.isArray(page?.content) ? page.content : [],
    totalPages: Number(page?.totalPages ?? 0),
    totalElements: Number(page?.totalElements ?? 0),
    last: Boolean(page?.last ?? true),
    number: Number(page?.number ?? 0),
  };
}

export async function getOrCreateConversation(target: {
  targetUserId?: number | string;
  targetCompanyId?: number | string;
}): Promise<ConversationItem> {
  const res = await apiClient.post("/api/messages/conversations", {
    targetUserId: target.targetUserId ?? undefined,
    targetCompanyId: target.targetCompanyId ?? undefined,
  });
  return unwrapData<ConversationItem>(res.data);
}

export async function listReservedCompanies(): Promise<ReservedCompanyItem[]> {
  const res = await apiClient.get("/api/reservations/my/companies");
  const data = unwrapData<any>(res.data);
  return Array.isArray(data) ? data : [];
}

export async function getConversation(conversationId: number | string): Promise<ConversationItem> {
  const res = await apiClient.get(`/api/messages/conversations/${conversationId}`);
  return unwrapData<ConversationItem>(res.data);
}

export async function listMessages(
    conversationId: number | string,
    params: { afterId?: number; page?: number; size?: number } = {}
): Promise<MessageItem[]> {
  const res = await apiClient.get(`/api/messages/conversations/${conversationId}/messages`, {
    params: params.afterId
        ? { afterId: params.afterId }
        : { page: params.page ?? 0, size: params.size ?? 30 },
  });
  const data = unwrapData<any>(res.data);
  return Array.isArray(data) ? data : [];
}

export async function sendMessage(
    conversationId: number | string,
    content: string
): Promise<MessageItem> {
  const res = await apiClient.post(`/api/messages/conversations/${conversationId}/messages`, { content });
  return unwrapData<MessageItem>(res.data);
}

export async function reportMessage(req: {
  conversationId: number | string;
  messageId?: number;
  reason: ReportReason;
  detail?: string;
}): Promise<void> {
  await apiClient.post("/api/messages/reports", {
    conversationId: req.conversationId,
    messageId: req.messageId,
    reason: req.reason,
    detail: req.detail || undefined,
  });
}
