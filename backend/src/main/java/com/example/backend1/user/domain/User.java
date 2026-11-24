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

    @Column(name = "road_address", length = 300)
    private String roadAddress;
    @Column(name = "address_detail", length = 200)
    private String addressDetail;
    @Column(name = "postal_code", length = 10)
    private String postalCode;
    private Double latitude;
    private Double longitude;

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

    /** 관리자 차단 여부. 차단되면 로그인·토큰 재발급이 막힌다. */
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean blocked = false;

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
    public boolean isBlocked() { return blocked; }
    public void block() { this.blocked = true; }
    public void unblock() { this.blocked = false; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getAddress() { return address; }
    public String getRoadAddress() { return roadAddress; }
    public String getAddressDetail() { return addressDetail; }
    public String getPostalCode() { return postalCode; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
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
            String address,
            String roadAddress,
            String addressDetail,
            String postalCode,
            Double latitude,
            Double longitude
    ) {
        if (residenceType != null) this.residenceType = residenceType;
        if (rentType != null) this.rentType = rentType;
        if (phoneNumber != null) this.phoneNumber = phoneNumber;
        if (address != null) this.address = address;
        if (roadAddress != null) this.roadAddress = roadAddress;
        if (addressDetail != null) this.addressDetail = addressDetail;
        if (postalCode != null) this.postalCode = postalCode;
        if (latitude != null) this.latitude = latitude;
        if (longitude != null) this.longitude = longitude;
    }

    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    /** 탈퇴 처리: 식별 가능한 개인정보를 모두 지우고 로그인 불가 상태로 만든다. */
    public void withdraw(String anonymizedUsername, String unusablePasswordHash) {
        this.username = anonymizedUsername;
        this.email = null;
        this.passwordHash = unusablePasswordHash;
        // phone_number 는 NOT NULL + 유니크 인덱스라 빈 값을 쓰면 두 번째 탈퇴부터 충돌한다.
        this.phoneNumber = "withdrawn-" + this.id;
        this.address = null;
        this.roadAddress = null;
        this.addressDetail = null;
        this.postalCode = null;
        this.latitude = null;
        this.longitude = null;
        this.marketingAgreed = false;
    }
}
