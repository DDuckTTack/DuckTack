package com.example.backend1.auth.dto;

public record LoginRequest(
        String username,
        String password
) {}