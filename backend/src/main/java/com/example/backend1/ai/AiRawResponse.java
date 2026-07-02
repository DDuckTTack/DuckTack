package com.example.backend1.ai;

import java.util.List;

public record AiRawResponse(
        String issueType,          // 예: LEAK, MOLD, CRACK
        String subType,            // 예: CEILING_WATER_STAIN, WINDOW_FRAME_MOLD
        Integer riskScore,         // 0~100
        Double confidence,         // 0~1
        String recommendedAction,  // DIY, PRO
        Boolean diyPossible,
        String summary,
        List<String> reasons,
        List<String> cautionNotes
) {}