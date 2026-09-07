import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import { layout, actionBtn } from "./adminTheme";

const ISSUE_OPTIONS = [
    { value: "CRACK", label: "균열" },
    { value: "MOLD", label: "곰팡이" },
    { value: "PEEL", label: "벗겨짐" },
    { value: "LEAK", label: "누수" },
    { value: "CORROSION", label: "부식" },
    { value: "BULGE", label: "들뜸" },
    { value: "ETC", label: "기타" },
];

function getCategoryLabel(category) {
    return ISSUE_OPTIONS.find((o) => o.value === category)?.label || category;
}

function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState("");

    const [form, setForm] = useState({
        name: "",
        coupangUrl: "",
        category: "MOLD",
        active: true,
    });

    const styles = useMemo(
        () => ({
            container: layout.container,
            header: layout.headerRow,
            title: layout.title,
            subtitle: layout.subTitle,
            reloadBtn: actionBtn("primary"),

            formCard: {
                ...layout.filterCard,
                display: "block",
                borderRadius: "16px",
            },

            formTitle: {
                fontSize: "16px",
                fontWeight: "800",
                color: "#1e293b",
                marginBottom: "16px",
            },

            formGrid: {
                display: "grid",
                gridTemplateColumns: "1.2fr 0.8fr 0.8fr",
                gap: "12px",
                marginBottom: "12px",
            },

            input: {
                height: "42px",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "0 12px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
            },

            select: {
                height: "42px",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "0 12px",
                backgroundColor: "#F8FAFC",
                fontWeight: "600",
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
                cursor: "pointer",
            },

            formBottom: {
                display: "grid",
                gridTemplateColumns: "1fr 180px",
                gap: "12px",
                alignItems: "center",
            },

            longInput: {
                height: "42px",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "0 12px",
                fontSize: "14px",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
            },

            addBtn: { ...actionBtn("primary"), height: "42px", marginRight: 0 },

            filterRow: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
            },

            countText: {
                color: "#64748b",
                fontSize: "14px",
                fontWeight: "700",
            },

            grid: {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "22px",
            },

            card: (active) => ({
                backgroundColor: "white",
                borderRadius: "20px",
                overflow: "hidden",
                boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
                border: active ? "1px solid #E2E8F0" : "1px solid #FCA5A5",
                opacity: active ? 1 : 0.58,
            }),

            content: {
                padding: "22px",
            },

            nameRow: {
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
                alignItems: "flex-start",
                marginBottom: "12px",
            },

            name: {
                fontSize: "20px",
                fontWeight: "900",
                color: "#1E293B",
                lineHeight: "26px",
            },

            badge: (active) => ({
                fontSize: "12px",
                fontWeight: "900",
                color: active ? "#15803D" : "#B91C1C",
                backgroundColor: active ? "#DCFCE7" : "#FEE2E2",
                padding: "5px 10px",
                borderRadius: "999px",
                whiteSpace: "nowrap",
            }),

            metaBox: {
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "14px",
                padding: "14px",
                marginBottom: "14px",
            },

            meta: {
                fontSize: "14px",
                color: "#64748B",
                lineHeight: "22px",
                wordBreak: "break-all",
            },

            linkBtn: {
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                backgroundColor: "#EFF6FF",
                color: "#2563EB",
                padding: "12px",
                borderRadius: "12px",
                fontWeight: "900",
                marginBottom: "12px",
            },

            actionRow: {
                display: "flex",
                gap: "8px",
            },

            hideBtn: { ...actionBtn("warning"), flex: 1, textAlign: "center", marginRight: 0 },
            showBtn: { ...actionBtn("success"), flex: 1, textAlign: "center", marginRight: 0 },
            deleteBtn: { ...actionBtn("danger"), flex: 1, textAlign: "center", marginRight: 0 },

            empty: { ...layout.tableCard, ...layout.emptyBox, fontWeight: "700" },
        }),
        []
    );

    const extractList = (responseData) => {
        const body = responseData?.data ?? responseData;

        if (Array.isArray(body)) return body;
        if (Array.isArray(body?.content)) return body.content;
        if (Array.isArray(body?.data)) return body.data;
        if (Array.isArray(responseData?.data?.content)) return responseData.data.content;

        return [];
    };

    const normalizeProduct = (p) => ({
        id: p.id,
        name: p.name || "-",
        coupangUrl: p.coupangUrl || p.link || "",
        category: p.category || "ETC",
        active: p.active !== false,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    });

    const fetchProducts = async () => {
        try {
            setLoading(true);

            const res = await axios.get("/api/admin/products", {
                params: categoryFilter ? { category: categoryFilter } : {},
            });

            const list = extractList(res.data).map(normalizeProduct);

            console.log("물품관리 목록:", list);

            setProducts(list);
        } catch (e) {
            console.error("물품 목록 조회 실패:", e);
            alert("물품 목록 조회 실패");
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryFilter]);

    const updateForm = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const resetForm = () => {
        setForm({
            name: "",
            coupangUrl: "",
            category: "MOLD",
            active: true,
        });
    };

    const createProduct = async () => {
        if (!form.name.trim()) {
            alert("상품명을 입력하세요.");
            return;
        }

        if (!form.coupangUrl.trim()) {
            alert("쿠팡 파트너스 링크를 입력하세요.");
            return;
        }

        try {
            await axios.post("/api/admin/products", {
                name: form.name.trim(),
                productId: null,
                coupangUrl: form.coupangUrl.trim(),
                imageUrl: null,
                category: form.category,
                active: form.active,
            });

            resetForm();
            fetchProducts();
        } catch (e) {
            console.error("물품 등록 실패:", e);
            alert("물품 등록 실패");
        }
    };

    const toggleActive = async (product) => {
        const nextActive = !product.active;

        const confirmText = nextActive
            ? "이 물품을 앱에 다시 노출할까요?"
            : "이 물품을 앱에서 숨길까요? DB에는 남고 앱에는 보이지 않습니다.";

        if (!window.confirm(confirmText)) return;

        try {
            await axios.patch(`/api/admin/products/${product.id}/active`, {
                active: nextActive,
            });

            setProducts((prev) =>
                prev.map((p) =>
                    p.id === product.id
                        ? {
                            ...p,
                            active: nextActive,
                        }
                        : p
                )
            );
        } catch (e) {
            console.error("노출 상태 변경 실패:", e);
            alert("노출 상태 변경 실패");
        }
    };

    const deleteProduct = async (product) => {
        if (
            !window.confirm(
                `"${product.name}"을 완전히 삭제할까요?\n\n복구가 어렵습니다. 보통은 '앱에서 숨김'을 권장합니다.`
            )
        ) {
            return;
        }

        try {
            await axios.delete(`/api/admin/products/${product.id}`);

            setProducts((prev) => prev.filter((p) => p.id !== product.id));
        } catch (e) {
            console.error("물품 삭제 실패:", e);
            alert("물품 삭제 실패");
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h2 style={styles.title}>📦 물품 관리</h2>
                    <div style={styles.subtitle}>
                        쿠팡 파트너스 링크 상품을 관리합니다. 앱 숨김 처리한 상품은 앱 추천 목록에 노출되지 않습니다.
                    </div>
                </div>

                <button style={styles.reloadBtn} onClick={fetchProducts}>
                    새로고침
                </button>
            </div>

            <div style={styles.formCard}>
                <div style={styles.formTitle}>상품 등록</div>

                <div style={styles.formGrid}>
                    <input
                        style={styles.input}
                        placeholder="상품명 예: 곰팡이 제거제"
                        value={form.name}
                        onChange={(e) => updateForm("name", e.target.value)}
                    />

                    <select
                        style={styles.select}
                        value={form.category}
                        onChange={(e) => updateForm("category", e.target.value)}
                    >
                        {ISSUE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>

                    <select
                        style={styles.select}
                        value={form.active ? "true" : "false"}
                        onChange={(e) => updateForm("active", e.target.value === "true")}
                    >
                        <option value="true">앱 노출</option>
                        <option value="false">앱 숨김</option>
                    </select>
                </div>

                <div style={styles.formBottom}>
                    <input
                        style={styles.longInput}
                        placeholder="쿠팡 파트너스 링크"
                        value={form.coupangUrl}
                        onChange={(e) => updateForm("coupangUrl", e.target.value)}
                    />

                    <button style={styles.addBtn} onClick={createProduct}>
                        등록
                    </button>
                </div>
            </div>

            <div style={styles.filterRow}>
                <select
                    style={styles.select}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="">전체 카테고리</option>
                    {ISSUE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>

                <div style={styles.countText}>
                    {loading ? "불러오는 중..." : `총 ${products.length}개`}
                </div>
            </div>

            {products.length === 0 ? (
                <div style={styles.empty}>
                    {loading ? "물품 목록을 불러오는 중입니다." : "등록된 물품이 없습니다."}
                </div>
            ) : (
                <div style={styles.grid}>
                    {products.map((product) => (
                        <div key={product.id} style={styles.card(product.active)}>
                            <div style={styles.content}>
                                <div style={styles.nameRow}>
                                    <div style={styles.name}>{product.name}</div>

                                    <span style={styles.badge(product.active)}>
                                        {product.active ? "앱 노출" : "앱 숨김"}
                                    </span>
                                </div>

                                <div style={styles.metaBox}>
                                    <div style={styles.meta}>
                                        카테고리: {getCategoryLabel(product.category)}
                                    </div>
                                </div>

                                {product.coupangUrl ? (
                                    <a
                                        href={product.coupangUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={styles.linkBtn}
                                    >
                                        쿠팡 링크 열기
                                    </a>
                                ) : null}

                                <div style={styles.actionRow}>
                                    <button
                                        style={product.active ? styles.hideBtn : styles.showBtn}
                                        onClick={() => toggleActive(product)}
                                    >
                                        {product.active ? "앱에서 숨김" : "다시 노출"}
                                    </button>

                                    <button
                                        style={styles.deleteBtn}
                                        onClick={() => deleteProduct(product)}
                                    >
                                        완전 삭제
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ProductsPage;