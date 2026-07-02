package com.example.backend1.report.service;

import com.example.backend1.ai.DecisionService;
import com.example.backend1.diagnosis.domain.Diagnosis;
import com.example.backend1.report.entity.ReportDraft;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.List;

@Component
public class ReportRenderer {

    private final TemplateEngine templateEngine;

    public ReportRenderer(TemplateEngine templateEngine) {
        this.templateEngine = templateEngine;
    }

    public String toHtml(
            Diagnosis diagnosis,
            String summary,
            double confidence,
            String decision,
            List<String> reasons,
            List<String> cautionNotes,
            DecisionService.Estimate estimate,
            ReportDraft draft,
            List<String> beforeImages,
            List<String> afterImages
    ) {
        Context context = new Context();
        context.setVariable("diagnosis", diagnosis);
        context.setVariable("summary", summary);
        context.setVariable("confidence", confidence);
        context.setVariable("decision", decision);
        context.setVariable("reasons", reasons);
        context.setVariable("cautionNotes", cautionNotes);
        context.setVariable("estimate", estimate);
        context.setVariable("draft", draft);
        context.setVariable("beforeImages", beforeImages);
        context.setVariable("afterImages", afterImages);

        return templateEngine.process("report", context);
    }

    public String toHtml(
            Diagnosis diagnosis,
            String summary,
            double confidence,
            String decision,
            List<String> reasons,
            List<String> cautionNotes,
            DecisionService.Estimate estimate
    ) {
        return toHtml(diagnosis, summary, confidence, decision, reasons, cautionNotes, estimate, null, List.of(), List.of());
    }
}