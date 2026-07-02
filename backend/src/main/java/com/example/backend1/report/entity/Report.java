package com.example.backend1.report.entity;

import jakarta.persistence.*;

@Entity
public class Report {

    @Id @GeneratedValue
    private Long id;

    private String fileUrl;   // PDF/HTML 저장 위치
    private String summary;   // 요약 텍스트

    protected Report() {}

    public Report(String fileUrl, String summary) {
        this.fileUrl = fileUrl;
        this.summary = summary;
    }
}
