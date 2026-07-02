package com.example.backend1.ai;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ApiResponse;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.ai.DecisionService.FinalDecision;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Random;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final DecisionService decisionService;

    @PostMapping("/analyze")
    public ApiResponse<FinalDecision> analyze(@RequestBody AiAnalyzeRequest req) {

        List<String> imageUrls = req.imageUrls();

        if (imageUrls == null || imageUrls.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "분석할 사진이 없습니다.");
        }

        // 🔥 Fake AI 결과 생성
        String[] types = {"CRACK", "MOLD", "LEAK", "DAMAGE"};
        String issueType = types[new Random().nextInt(types.length)];

        AiRawResponse fake = new AiRawResponse(
                issueType,
                "DEFAULT",
                new Random().nextInt(100), // riskScore
                0.85,
                "DIY",
                true,
                "AI 분석 결과 문제 유형이 감지되었습니다.",
                List.of("이미지에서 손상 패턴이 감지되었습니다."),
                List.of("추가 손상 여부를 확인하세요.")
        );

        // 🔥 DecisionService로 최종 판단
        FinalDecision decision = decisionService.evaluate(fake);

        return ApiResponse.ok(decision);
    }
}