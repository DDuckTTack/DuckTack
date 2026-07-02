package com.example.backend1.diagnosis.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AnalysisResultDto {

    private String issueType;
    private int riskScore;
    private String result; // DIY or PRO

}