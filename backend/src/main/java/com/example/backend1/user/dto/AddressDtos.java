package com.example.backend1.user.dto;

public final class AddressDtos {
    private AddressDtos() {}
    public record Item(String roadAddress, String jibunAddress, String postalCode,
                       Double latitude, Double longitude) {}
}
