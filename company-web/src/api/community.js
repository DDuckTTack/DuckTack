import axios from "./axios";

function unwrap(res) {
    return res.data?.data ?? res.data;
}

export function listPosts({ boardType, keyword, regionCode, page = 0, size = 20, sort = "latest" } = {}) {
    return axios
        .get("/api/community/posts", {
            params: { boardType, keyword, regionCode, page, size, sort },
        })
        .then(unwrap);
}

export function getPost(postId) {
    return axios.get(`/api/community/posts/${postId}`).then(unwrap);
}

export function createPost(payload) {
    return axios.post("/api/community/posts", payload).then(unwrap);
}

export function updatePost(postId, payload) {
    return axios.put(`/api/community/posts/${postId}`, payload).then(unwrap);
}

export function deletePost(postId) {
    return axios.delete(`/api/community/posts/${postId}`).then(unwrap);
}

export function listComments(postId) {
    return axios.get(`/api/community/posts/${postId}/comments`).then(unwrap);
}

export function createComment(postId, content) {
    return axios.post(`/api/community/posts/${postId}/comments`, { content }).then(unwrap);
}

export function updateComment(commentId, content) {
    return axios.put(`/api/community/comments/${commentId}`, { content }).then(unwrap);
}

export function deleteComment(commentId) {
    return axios.delete(`/api/community/comments/${commentId}`).then(unwrap);
}

export function likePost(postId) {
    return axios.post(`/api/community/posts/${postId}/like`).then(unwrap);
}

export function unlikePost(postId) {
    return axios.delete(`/api/community/posts/${postId}/like`).then(unwrap);
}

export function reportContent({ targetType, targetId, reason, detail }) {
    return axios
        .post("/api/community/reports", { targetType, targetId, reason, detail })
        .then(unwrap);
}

export function listCommunityReports({ page = 0, size = 20 } = {}) {
    return axios.get("/api/admin/community-reports", { params: { page, size } }).then(unwrap);
}

export const BOARD_TYPES = [
    { value: "FREE", label: "자유게시판" },
    { value: "LOCAL", label: "지역별 커뮤니티" },
    { value: "PROMOTION", label: "업체홍보" },
    { value: "DIY_REVIEW", label: "DIY후기" },
    { value: "QNA", label: "Q&A" },
];

export const REPORT_REASONS = [
    { value: "SPAM", label: "스팸/도배" },
    { value: "ABUSE", label: "욕설/비방" },
    { value: "ADVERTISEMENT", label: "부적절한 광고" },
    { value: "FALSE_INFORMATION", label: "허위 정보" },
    { value: "PERSONAL_INFORMATION", label: "개인정보 노출" },
    { value: "OTHER", label: "기타" },
];

export function reportReasonLabel(value) {
    return REPORT_REASONS.find((reason) => reason.value === value)?.label ?? value;
}

export function boardTypeLabel(value) {
    return BOARD_TYPES.find((b) => b.value === value)?.label ?? value;
}

// regionCode is used for exact-match filtering on the backend, so it must be
// derived deterministically from the free-text region name (whitespace should
// not cause a search miss). regionName stays as the raw display text.
export function normalizeRegionCode(value) {
    return (value || "").trim().replace(/\s+/g, "");
}
