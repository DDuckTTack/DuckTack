package com.example.backend1.company.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NearbyRequest {
    private double latitude;
    private double longitude;
    private String region;
}