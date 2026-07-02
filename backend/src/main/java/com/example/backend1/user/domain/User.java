package com.example.backend1.user.domain;

import com.example.backend1.company.domain.Company;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "users",
        indexes = {
                @Index(name = "idx_users_username", columnList = "username", unique = true),
                @Index(name = "idx_users_email", columnList = "email", unique = true),
                @Index(name = "idx_users_phone_number", columnList = "phone_number", unique = true)
        })
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private boolean termsAgreed;

    @Column(nullable = false)
    private boolean privacyAgreed;

    @Column(nullable = false)
    private boolean marketingAgreed;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(unique = true, length = 255)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(name = "phone_number", nullable = false, length = 30)
    private String phoneNumber;

    @Column(length = 255)
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResidenceType residenceType = ResidenceType.ETC;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RentType rentType = RentType.NONE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role = UserRole.USER;

    // 업체 계정일 경우 연결되는 업체 정보
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected User() {}

    // 일반 회원가입 생성자
    public User(String username, String email, String passwordHash, String phoneNumber,
                ResidenceType residenceType, RentType rentType, String address,
                boolean termsAgreed, boolean privacyAgreed, boolean marketingAgreed) {

        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        this.phoneNumber = phoneNumber;
        this.residenceType = residenceType;
        this.rentType = rentType;
        this.address = address;
        this.termsAgreed = termsAgreed;
        this.privacyAgreed = privacyAgreed;
        this.marketingAgreed = marketingAgreed;
        this.role = UserRole.USER;
    }

    // 관리자 생성자
    public User(String username, String passwordHash, String phoneNumber) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.phoneNumber = phoneNumber;
        this.role = UserRole.ADMIN;
    }

    // 업체 회원가입 생성자
    public User(String username, String passwordHash, String phoneNumber, UserRole role, Company company) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.phoneNumber = phoneNumber;
        this.role = role;
        this.company = company;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getAddress() { return address; }
    public ResidenceType getResidenceType() { return residenceType; }
    public RentType getRentType() { return rentType; }
    public UserRole getRole() { return role; }
    public Company getCompany() { return company; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    public void setRole(UserRole role) {
        if (role != null) {
            this.role = role;
        }
    }

    public void updateProfile(
            ResidenceType residenceType,
            RentType rentType,
            String phoneNumber,
            String address
    ) {
        if (residenceType != null) this.residenceType = residenceType;
        if (rentType != null) this.rentType = rentType;
        if (phoneNumber != null) this.phoneNumber = phoneNumber;
        if (address != null) this.address = address;
    }

    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}