package com.example.backend1.auth.dto;

import java.util.List;

public record CompanySignupRequest(

        // 🔥 로그인 계정
        String username,
        String password,
        String phone,

        // 🔥 업체 정보
        String companyName,
        String businessNumber,
        String ownerName,
        String companyPhone,
        String email,
        String address,
        String zipCode,
        String serviceArea,
        List<String> specialties
) {}