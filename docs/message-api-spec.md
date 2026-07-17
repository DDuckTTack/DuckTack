# 쪽지(메시지) API 명세

Base URL:

```
/api/messages
```

관리자 전용 엔드포인트 Base URL:

```
/api/admin/message-reports
```

응답 공통 형식 (기존 커뮤니티 명세와 동일):

```ts
type ApiResponse<T> = {
  success: boolean;
  code?: string;
  message?: string;
  data: T;
  timestamp: string;
};
```

인증: 아래 모든 엔드포인트는 로그인 필요 (`Authorization: Bearer {accessToken}`). 비로그인 접근 불가.

업체 계정도 내부적으로는 `User(role=COMPANY)`이므로, 쪽지는 항상 **사용자 ↔ 사용자** 구조로 동작한다. "업체에게 쪽지 보내기"는 `targetCompanyId`로 요청하면 서버가 그 업체를 소유한 `User` 계정을 찾아 대화를 연결해준다.

---

## 1. 내 대화 목록 조회

```
GET /api/messages/conversations
```

Query:

```ts
{
  type?: "USER" | "COMPANY"; // 생략 시 전체. 상대방이 업체 계정인지로 자동 분류됨
  page?: number; // default 0
  size?: number; // default 20
}
```

정렬: 최근 메시지순(`lastMessageAt` desc).

Response:

```ts
ApiResponse<{
  content: ConversationItem[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}>
```

---

## 2. 대화 생성 또는 조회

```
POST /api/messages/conversations
Authorization: Bearer {accessToken}
Content-Type: application/json
```

Request:

```ts
{
  targetUserId?: number;    // 사용자에게 쪽지 시작
  targetCompanyId?: number; // 업체에게 쪽지 시작 (targetUserId와 둘 중 하나 필수)
}
```

같은 두 사용자 사이에 이미 대화가 있으면 새로 만들지 않고 기존 대화를 그대로 반환한다.

Response:

```ts
ApiResponse<ConversationItem>
```

에러:
- `COMPANY_HAS_NO_ACCOUNT` (404) — `targetCompanyId`로 지정한 업체가 아직 쪽지를 받을 수 있는 계정(제휴 가입 계정)이 연결되어 있지 않음. **관리자 등록/카카오 API로만 가져온 비제휴 업체는 여기 해당** → 프론트에서는 제휴 업체(예: `isPartner === true` && `companyId` 존재)에만 쪽지 버튼을 노출할 것.
- `USER_NOT_FOUND` (404) — `targetUserId`가 존재하지 않음.
- `INVALID_INPUT` (400) — 둘 다 비어있거나, 자기 자신을 대상으로 지정.

---

## 3. 대화 상세 조회

```
GET /api/messages/conversations/{conversationId}
```

Response:

```ts
ApiResponse<ConversationItem>
```

에러: `CONVERSATION_NOT_FOUND` (404), `ACCESS_DENIED` (403, 참여자가 아닌 경우)

---

## 4. 메시지 목록 조회 (폴링용)

```
GET /api/messages/conversations/{conversationId}/messages
```

Query:

```ts
{
  afterId?: number; // 있으면 이 id보다 큰 메시지만 오름차순으로 반환 (폴링)
  page?: number;    // afterId 없을 때만 사용, default 0
  size?: number;    // afterId 없을 때만 사용, default 30
}
```

- `afterId` 없이 호출: 최신 메시지 `size`개를 오래된 순으로 반환 (최초 로드용).
- `afterId` 지정해서 호출: 그 이후 새 메시지만 오름차순으로 반환 (폴링용). **대화방 화면이 열려있는 동안 1초 간격으로 이 방식으로 반복 호출할 것을 권장** (화면이 백그라운드/이탈 상태가 되면 반드시 폴링 중단) — 별도 실시간(WebSocket) 인프라는 없음.
- 이 API를 호출하면 서버에서 자동으로 "읽음" 처리되어(내 읽음 커서 갱신) 목록 화면의 `unreadCount`가 0으로 내려간다.

Response:

```ts
ApiResponse<MessageItem[]>
```

에러: `CONVERSATION_NOT_FOUND`, `ACCESS_DENIED`

---

## 5. 메시지 전송

```
POST /api/messages/conversations/{conversationId}/messages
Authorization: Bearer {accessToken}
Content-Type: application/json
```

Request:

```ts
{
  content: string; // 1~2000자
}
```

Response:

```ts
ApiResponse<MessageItem>
```

---

## 6. 신고 (메시지 또는 상대방)

```
POST /api/messages/reports
Authorization: Bearer {accessToken}
Content-Type: application/json
```

Request:

```ts
{
  conversationId: number;
  messageId?: number;  // 특정 메시지를 신고. 생략하면 "상대방 전체" 신고로 처리됨
  reason: ReportReason;
  detail?: string;      // 최대 1000자
}
```

`reason` 값 (커뮤니티 명세와 동일):

```ts
type ReportReason =
  | "SPAM"
  | "ABUSE"
  | "ADVERTISEMENT"
  | "FALSE_INFORMATION"
  | "PERSONAL_INFORMATION"
  | "OTHER";
```

Response:

```ts
ApiResponse<null>
```

---

## 7. [관리자] 신고 목록 조회

```
GET /api/admin/message-reports
Authorization: Bearer {accessToken}  (ADMIN 권한 필요)
```

Query:

```ts
{
  status?: "PENDING" | "RESOLVED" | "REJECTED"; // 생략 시 전체
  page?: number; // default 0
  size?: number; // default 20
}
```

Response:

```ts
ApiResponse<{
  content: AdminMessageReportItem[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}>
```

---

## 8. [관리자] 신고 처리

```
POST /api/admin/message-reports/{reportId}/resolve
Authorization: Bearer {accessToken}  (ADMIN 권한 필요)
Content-Type: application/json
```

Request:

```ts
{
  action: "RESOLVE" | "REJECT";
  adminMemo?: string; // 최대 500자
}
```

Response:

```ts
ApiResponse<null>
```

---

## DTO

```ts
type ConversationItem = {
  conversationId: number;
  otherUserId: number;
  otherUsername: string;
  otherIsCompany: boolean;   // 상대방이 업체 계정(role=COMPANY)인지 — 쪽지 목록 "사용자"/"업체" 탭 분류 기준
  otherDisplayName: string;  // 업체면 업체명, 아니면 username
  lastMessagePreview: string | null;
  lastMessageAt: string | null; // ISO datetime
  unreadCount: number;
};

type MessageItem = {
  id: number;
  conversationId: number;
  senderId: number;
  senderUsername: string;
  mine: boolean;       // 내가 보낸 메시지인지 (요청자 기준)
  content: string;
  createdAt: string;   // ISO datetime
};

type MessageReportStatus = "PENDING" | "RESOLVED" | "REJECTED";

type AdminMessageReportItem = {
  id: number;
  conversationId: number;
  reporterId: number;
  reporterUsername: string;
  reportedUserId: number;
  reportedUsername: string;
  reportedMessageId: number | null;
  reportedMessageContent: string | null; // null이면 "상대방 전체" 신고
  reason: ReportReason;
  detail: string | null;
  status: MessageReportStatus;
  adminMemo: string | null;
  createdAt: string;
  resolvedAt: string | null;
};
```

---

## 에러 코드

| code | HTTP status | 설명 |
|---|---|---|
| `COMPANY_HAS_NO_ACCOUNT` | 404 | 대상 업체에 연결된 쪽지 수신 계정이 없음 (비제휴 업체) |
| `CONVERSATION_NOT_FOUND` | 404 | 대화를 찾을 수 없음 |
| `MESSAGE_NOT_FOUND` | 404 | 메시지를 찾을 수 없음 |
| `MESSAGE_REPORT_NOT_FOUND` | 404 | 신고 내역을 찾을 수 없음 (관리자 처리 시) |
| `USER_NOT_FOUND` | 404 | 대상 사용자를 찾을 수 없음 |
| `ACCESS_DENIED` | 403 | 해당 대화의 참여자가 아님 |
| `INVALID_INPUT` | 400 | 요청값 누락/형식 오류 |
| `AUTH_FAILED` | 401 | 인증 실패/토큰 없음 |

---

## 주의사항

- 전체 엔드포인트 로그인 필요 (커뮤니티 명세와 달리 비로그인 조회 없음).
- "업체에게 쪽지" 진입점은 **제휴 업체에만** 노출할 것 — `targetCompanyId`로 시도했을 때 비제휴 업체면 `COMPANY_HAS_NO_ACCOUNT`가 내려온다.
- 실시간성은 WebSocket이 아니라 **폴링**으로 처리: 대화방이 열려있는 동안 1초 간격으로 `GET .../messages?afterId={마지막으로_받은_id}` 반복 호출. 화면이 백그라운드로 가거나 벗어나면 반드시 폴링을 멈출 것 (배터리/트래픽 절약).
- 이미지/첨부파일 업로드는 아직 미구현 (텍스트만).
- 날짜는 ISO 문자열로 내려오므로 `new Date(createdAt)` 처리 가능하게 정규화 권장.
- 신고 처리 결과(RESOLVE/REJECT)는 신고자에게 별도 알림이 가지 않는다 (알림 인프라 없음) — 필요 시 추후 논의.
