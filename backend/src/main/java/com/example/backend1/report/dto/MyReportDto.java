package com.example.backend1.report.dto;

public class MyReportDto {

    private Long diagnosisId;
    private boolean hasReport;

    public MyReportDto(Long diagnosisId, boolean hasReport) {
        this.diagnosisId = diagnosisId;
        this.hasReport = hasReport;
    }

    public Long getDiagnosisId() {
        return diagnosisId;
    }

    public boolean isHasReport() {
        return hasReport;
    }
}