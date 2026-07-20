import axios from "./axios";

function unwrap(res) {
    return res.data?.data ?? res.data;
}

export function listConversations({ type, page = 0, size = 20 } = {}) {
    return axios
        .get("/api/messages/conversations", { params: { type, page, size } })
        .then(unwrap);
}

export function getOrCreateConversation({ targetUserId, targetCompanyId }) {
    return axios
        .post("/api/messages/conversations", { targetUserId, targetCompanyId })
        .then(unwrap);
}

export function getConversation(conversationId) {
    return axios.get(`/api/messages/conversations/${conversationId}`).then(unwrap);
}

export function listMessages(conversationId, { afterId, page = 0, size = 30 } = {}) {
    return axios
        .get(`/api/messages/conversations/${conversationId}/messages`, {
            params: afterId ? { afterId } : { page, size },
        })
        .then(unwrap);
}

export function sendMessage(conversationId, content) {
    return axios
        .post(`/api/messages/conversations/${conversationId}/messages`, { content })
        .then(unwrap);
}

export function reportMessage({ conversationId, messageId, reason, detail }) {
    return axios
        .post("/api/messages/reports", { conversationId, messageId, reason, detail })
        .then(unwrap);
}
