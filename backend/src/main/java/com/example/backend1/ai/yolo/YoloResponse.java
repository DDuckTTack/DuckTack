package com.example.backend1.ai.yolo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record YoloResponse(
        String status,
        Integer count,
        List<Detection> detections
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Detection(
            String label,
            Double confidence,
            List<Integer> bbox,
            @JsonProperty("area_ratio") Double areaRatio,
            @JsonProperty("mask_area") Integer maskArea,
            @JsonProperty("segmentation_applied") Boolean segmentationApplied
    ) {
        public DefectClass toDefectClass() {
            return DefectClass.fromLabel(label);
        }
    }
}