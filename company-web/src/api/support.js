import axios from "./axios";

function unwrap(res) {
    return res.data?.data ?? res.data;
}

export function listThreads({ status, page = 0, size = 20 } = {}) {
    return axios
        .get("/api/admin/support/threads", { params: { status, page, size } })
        .then(unwrap);
}

export function getThread(threadId) {
    return axios.get(`/api/admin/support/threads/${threadId}`).then(unwrap);
}

export function listMessages(threadId, { afterId, page = 0, size = 30 } = {}) {
    return axios
        .get(`/api/admin/support/threads/${threadId}/messages`, {
            params: afterId ? { afterId } : { page, size },
        })
        .then(unwrap);
}

export function sendMessage(threadId, content) {
    return axios
        .post(`/api/admin/support/threads/${threadId}/messages`, { content })
        .then(unwrap);
}
