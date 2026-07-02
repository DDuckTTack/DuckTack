package com.example.backend1.ai.yolo;

import com.example.backend1.diagnosis.domain.IssueType;

import java.util.Arrays;
import java.util.Set;

public enum DefectClass {

    LEAK(
            "leak",
            IssueType.LEAK,
            Set.of("leak", "leakage", "water_leak", "water-leak", "water leak", "누수")
    ),

    MOLD(
            "mold",
            IssueType.MOLD,
            Set.of("mold", "mould", "fungus", "곰팡이")
    ),

    CRACK(
            "crack",
            IssueType.CRACK,
            Set.of("crack", "cracks", "wall_crack", "wall-crack", "wall crack", "균열")
    ),

    PEEL(
            "peel",
            IssueType.PEEL,
            Set.of("peel", "peeling", "paint_peel", "paint-peel", "paint peel", "박리", "벗겨짐")
    ),

    CORROSION(
            "corrosion",
            IssueType.CORROSION,
            Set.of("corrosion", "rust", "rusting", "녹", "부식")
    ),

    BULGE(
            "bulge",
            IssueType.BULGE,
            Set.of("bulge", "bulging", "lifting", "lift", "detachment", "뜸", "들뜸")
    ),

    STAIN(
            "stain",
            IssueType.ETC,
            Set.of("stain", "stains", "water_stain", "water-stain", "얼룩")
    ),

    DAMAGE(
            "damage",
            IssueType.DAMAGE,
            Set.of("damage", "broken", "breakage", "파손")
    ),

    ELECTRIC(
            "electric",
            IssueType.ELECTRIC,
            Set.of("electric", "electrical", "전기")
    ),

    GAS(
            "gas",
            IssueType.GAS,
            Set.of("gas", "가스")
    ),

    OTHER(
            "other",
            IssueType.ETC,
            Set.of("other", "unknown", "etc", "기타")
    );

    private final String code;
    private final IssueType issueType;
    private final Set<String> labels;

    DefectClass(String code, IssueType issueType, Set<String> labels) {
        this.code = code;
        this.issueType = issueType;
        this.labels = labels;
    }

    public String code() {
        return code;
    }

    public IssueType issueType() {
        return issueType;
    }

    public Set<String> labels() {
        return labels;
    }

    /**
     * YOLO 문자열 label → DefectClass 변환
     */
    public static DefectClass fromLabel(String raw) {
        if (raw == null || raw.isBlank()) {
            return OTHER;
        }

        String normalized = raw.trim()
                .toLowerCase()
                .replace(" ", "_")
                .replace("-", "_");

        return Arrays.stream(values())
                .filter(d -> d.matches(normalized))
                .findFirst()
                .orElse(OTHER);
    }

    private boolean matches(String normalized) {
        if (code.equalsIgnoreCase(normalized)) {
            return true;
        }

        return labels.stream()
                .map(v -> v.trim().toLowerCase().replace(" ", "_").replace("-", "_"))
                .anyMatch(v -> v.equals(normalized));
    }
}