// 쪽지(메시지) 기능은 아직 백엔드 API가 없어서, 데모/미리보기용으로
// localStorage에 저장되는 목업 데이터로 동작합니다. 실제 서버와는 무관합니다.

const STORAGE_KEY = "ddt_mock_messages_v1";

function readStore() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : { threads: [] };
    } catch {
        return { threads: [] };
    }
}

function writeStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function seedIfEmpty() {
    const store = readStore();
    if (store.threads.length > 0) return store;

    const now = Date.now();
    store.threads = [
        {
            id: "seed-user-1",
            counterpartType: "USER",
            counterpartName: "김민준",
            messages: [
                { id: "m1", sender: "them", text: "안녕하세요, 견적 문의드립니다!", createdAt: now - 1000 * 60 * 60 },
                { id: "m2", sender: "me", text: "안녕하세요! 어떤 부분이 궁금하신가요?", createdAt: now - 1000 * 60 * 55 },
            ],
            reports: [],
        },
        {
            id: "seed-company-1",
            counterpartType: "COMPANY",
            counterpartName: "행복설비",
            messages: [
                { id: "m3", sender: "them", text: "협업 관련 문의드립니다.", createdAt: now - 1000 * 60 * 30 },
            ],
            reports: [],
        },
    ];
    writeStore(store);
    return store;
}

export function getThreads(counterpartType) {
    const store = seedIfEmpty();
    const sorted = [...store.threads].sort((a, b) => {
        const aLast = a.messages[a.messages.length - 1]?.createdAt ?? 0;
        const bLast = b.messages[b.messages.length - 1]?.createdAt ?? 0;
        return bLast - aLast;
    });
    if (!counterpartType) return sorted;
    return sorted.filter((t) => t.counterpartType === counterpartType);
}

export function getThread(threadId) {
    const store = seedIfEmpty();
    return store.threads.find((t) => t.id === threadId) ?? null;
}

export function getOrCreateThread(counterpartName, counterpartType) {
    const store = seedIfEmpty();
    let thread = store.threads.find(
        (t) => t.counterpartName === counterpartName && t.counterpartType === counterpartType
    );
    if (!thread) {
        thread = {
            id: `t-${Date.now()}`,
            counterpartType,
            counterpartName,
            messages: [],
            reports: [],
        };
        store.threads.push(thread);
        writeStore(store);
    }
    return thread;
}

export function sendMessage(threadId, text) {
    const store = seedIfEmpty();
    const thread = store.threads.find((t) => t.id === threadId);
    if (!thread) return null;

    const message = { id: `m-${Date.now()}`, sender: "me", text, createdAt: Date.now() };
    thread.messages.push(message);
    writeStore(store);
    return message;
}

export function reportThread(threadId, reason, detail) {
    const store = seedIfEmpty();
    const thread = store.threads.find((t) => t.id === threadId);
    if (!thread) return;

    thread.reports.push({ reason, detail, createdAt: Date.now() });
    writeStore(store);
}
