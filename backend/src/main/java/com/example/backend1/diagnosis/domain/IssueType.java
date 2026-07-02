package com.example.backend1.diagnosis.domain;

public enum IssueType {
    CRACK,
    MOLD,
    PEEL,
    LEAK,
    CORROSION,
    BULGE,
    ETC,

    // 기존 호환용
    DAMAGE,
    ELECTRIC,
    GAS
}