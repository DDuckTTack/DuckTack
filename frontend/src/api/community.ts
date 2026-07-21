import { apiClient } from "./apiClient";

export type BoardType = "FREE" | "LOCAL" | "PROMOTION" | "DIY_REVIEW" | "QNA";
export type ReportTargetType = "POST" | "COMMENT";
export type ReportReason =
    | "SPAM"
    | "ABUSE"
    | "ADVERTISEMENT"
    | "FALSE_INFORMATION"
    | "PERSONAL_INFORMATION"
    | "OTHER";
export type SortOption = "latest" | "views" | "likes";

export const BOARD_TYPE_LABELS: Record<BoardType, string> = {
  FREE: "자유",
  LOCAL: "지역별",
  PROMOTION: "업체홍보",
  DIY_REVIEW: "DIY 후기",
  QNA: "Q&A",
};

export const BOARD_TYPE_ORDER: BoardType[] = ["FREE", "LOCAL", "PROMOTION", "DIY_REVIEW", "QNA"];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "스팸/도배",
  ABUSE: "욕설/비방",
  ADVERTISEMENT: "광고성 게시물",
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

// LOCAL 게시판은 현재 "경기대학교 주변" 1개 지역만 지원합니다.
export const FIXED_LOCAL_REGION = { regionCode: "KYONGGI_UNIV", regionName: "경기대학교 주변" };

export type PostListItem = {
  id: number;
  postId: number;
  boardType: BoardType;
  title: string;
  contentPreview: string;
  authorId: number | string;
  authorName: string;
  regionName?: string | null;
  productName?: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  createdAt: string;
};

export type PostDetail = PostListItem & {
  content: string;
  regionCode?: string | null;
  reportCount: number;
  status: string;
  updatedAt: string;
  editable: boolean;
  deletable: boolean;
};

export type CommentItem = {
  commentId: number;
  postId: number;
  content: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
  reportCount: number;
};

export type PostPage = {
  content: PostListItem[];
  totalPages: number;
  totalElements: number;
  last: boolean;
  number: number;
};

export type PostCreateRequest = {
  boardType: BoardType;
  title: string;
  content: string;
  regionCode?: string;
  regionName?: string;
  productName?: string;
};

export type PostUpdateRequest = PostCreateRequest;

export type LikeResponse = {
  postId: number;
  likeCount: number;
  likedByMe: boolean;
};

export type ReportRequest = {
  targetType: ReportTargetType;
  targetId: number;
  postId?: number;
  commentId?: number;
  reason: ReportReason;
  detail?: string;
};

export type ReportResponse = {
  reportId: number;
  targetType: ReportTargetType;
  targetId: number;
  reason: ReportReason;
};

function unwrapData<T>(raw: any): T {
  return raw?.data ?? raw;
}

export async function listPosts(params: {
  boardType?: BoardType;
  keyword?: string;
  regionCode?: string;
  page?: number;
  size?: number;
  sort?: SortOption;
}): Promise<PostPage> {
  const res = await apiClient.get("/api/community/posts", {
    params: {
      boardType: params.boardType,
      keyword: params.keyword || undefined,
      regionCode: params.regionCode,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort ?? "latest",
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

export async function getPost(postId: number | string): Promise<PostDetail> {
  const res = await apiClient.get(`/api/community/posts/${postId}`);
  return unwrapData<PostDetail>(res.data);
}

export async function getComments(postId: number | string): Promise<CommentItem[]> {
  const res = await apiClient.get(`/api/community/posts/${postId}/comments`);
  const data = unwrapData<any>(res.data);
  return Array.isArray(data) ? data : [];
}

export async function createComment(
    postId: number | string,
    content: string
): Promise<CommentItem> {
  const res = await apiClient.post(`/api/community/posts/${postId}/comments`, { content });
  return unwrapData<CommentItem>(res.data);
}

export async function updateComment(
    commentId: number | string,
    content: string
): Promise<CommentItem> {
  const res = await apiClient.put(`/api/community/comments/${commentId}`, { content });
  return unwrapData<CommentItem>(res.data);
}

export async function deleteComment(commentId: number | string): Promise<void> {
  await apiClient.delete(`/api/community/comments/${commentId}`);
}

export async function likePost(postId: number | string): Promise<LikeResponse> {
  const res = await apiClient.post(`/api/community/posts/${postId}/like`);
  return unwrapData<LikeResponse>(res.data);
}

export async function unlikePost(postId: number | string): Promise<LikeResponse> {
  const res = await apiClient.delete(`/api/community/posts/${postId}/like`);
  return unwrapData<LikeResponse>(res.data);
}

export async function createPost(req: PostCreateRequest): Promise<PostDetail> {
  const res = await apiClient.post("/api/community/posts", req);
  return unwrapData<PostDetail>(res.data);
}

export async function updatePost(
    postId: number | string,
    req: PostUpdateRequest
): Promise<PostDetail> {
  const res = await apiClient.put(`/api/community/posts/${postId}`, req);
  return unwrapData<PostDetail>(res.data);
}

export async function deletePost(postId: number | string): Promise<void> {
  await apiClient.delete(`/api/community/posts/${postId}`);
}

export async function reportContent(req: ReportRequest): Promise<ReportResponse> {
  const res = await apiClient.post("/api/community/reports", req);
  return unwrapData<ReportResponse>(res.data);
}
