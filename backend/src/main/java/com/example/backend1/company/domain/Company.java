package com.example.backend1.company.domain;

import com.example.backend1.diagnosis.domain.IssueType;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "companies", indexes = {
        @Index(name = "idx_companies_active", columnList = "active"),
        @Index(name = "idx_companies_kakao_place_id", columnList = "kakao_place_id", unique = true)
})
public class Company {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "kakao_place_id", length = 50, unique = true)
  private String kakaoPlaceId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private CompanySource source = CompanySource.ADMIN;

  @Column(name = "username", unique = true)
  private String username;

  @Column(nullable = false, length = 200)
  private String name;

  @Column(name = "business_registration_number", length = 20)
  private String businessRegistrationNumber;

  @Column(name = "representative_name", length = 100)
  private String representativeName;

  @Column(length = 30)
  private String phone;

  @Column(length = 255)
  private String email;

  @Column(name = "address_line", length = 500)
  private String addressLine;

  @Column(name = "postal_code", length = 20)
  private String postalCode;

  @Column(name = "service_region_label", length = 200)
  private String serviceRegionLabel;

  private Double latitude;
  private Double longitude;

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "company_specialties", joinColumns = @JoinColumn(name = "company_id"))
  @Enumerated(EnumType.STRING)
  @Column(name = "issue_type", length = 32)
  private Set<IssueType> specialties = new HashSet<>();

  @Column(name = "min_estimated_quote_krw")
  private Integer minEstimatedQuoteKrw;

  @Column(name = "max_estimated_quote_krw")
  private Integer maxEstimatedQuoteKrw;

  @Column(name = "capability_note", length = 2000)
  private String capabilityNote;

  @Column(nullable = false)
  private boolean active = false;

  @Column(name = "status", length = 255)
  private String status = "PENDING";

  @Column(name = "is_partner", nullable = false)
  private boolean partner = false;

  @Column(name = "partner_priority")
  private Integer partnerPriority = 0;

  @Column(name = "admin_memo", length = 2000)
  private String adminMemo;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  protected Company() {}

  public Company(String name) {
    this.name = name;
  }

  public static Company fromKakao(String kakaoPlaceId, String name, String phone,
                                  String address, Double lat, Double lng) {
    Company c = new Company(name);
    c.kakaoPlaceId = kakaoPlaceId;
    c.source = CompanySource.KAKAO;
    c.phone = phone;
    c.addressLine = address;
    c.latitude = lat;
    c.longitude = lng;
    c.active = true;
    c.status = "APPROVED";
    c.partner = false;
    c.partnerPriority = 0;
    return c;
  }

  public void updateFromKakao(String phone, String addressLine, Double latitude, Double longitude) {
    if (phone != null && !phone.isBlank() && (this.phone == null || this.phone.isBlank())) {
      this.phone = phone;
    }
    if (addressLine != null && !addressLine.isBlank() && (this.addressLine == null || this.addressLine.isBlank())) {
      this.addressLine = addressLine;
    }
    if (latitude != null && this.latitude == null) {
      this.latitude = latitude;
    }
    if (longitude != null && this.longitude == null) {
      this.longitude = longitude;
    }
    this.updatedAt = OffsetDateTime.now();
  }

  public Long getId() { return id; }
  public String getKakaoPlaceId() { return kakaoPlaceId; }
  public CompanySource getSource() { return source; }
  public String getUsername() { return username; }
  public String getName() { return name; }
  public String getBusinessRegistrationNumber() { return businessRegistrationNumber; }
  public String getRepresentativeName() { return representativeName; }
  public String getPhone() { return phone; }
  public String getEmail() { return email; }
  public String getAddressLine() { return addressLine; }
  public String getPostalCode() { return postalCode; }
  public String getServiceRegionLabel() { return serviceRegionLabel; }
  public Double getLatitude() { return latitude; }
  public Double getLongitude() { return longitude; }
  public Set<IssueType> getSpecialties() { return specialties; }
  public Integer getMinEstimatedQuoteKrw() { return minEstimatedQuoteKrw; }
  public Integer getMaxEstimatedQuoteKrw() { return maxEstimatedQuoteKrw; }
  public String getCapabilityNote() { return capabilityNote; }
  public boolean isActive() { return active; }
  public String getStatus() { return status; }
  public boolean isPartner() { return partner; }
  public Integer getPartnerPriority() { return partnerPriority; }
  public String getAdminMemo() { return adminMemo; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }

  public boolean isApproved() {
    return "APPROVED".equals(status);
  }

  public void markSignupPending(String username) {
    if (username != null && !username.isBlank()) {
      this.username = username;
    }
    this.status = "PENDING";
    this.active = false;
    this.partner = false;
    this.partnerPriority = 0;
    this.updatedAt = OffsetDateTime.now();
  }

  public void approvePartner() {
    this.status = "APPROVED";
    this.active = true;
    this.partner = true;

    if (this.partnerPriority == null || this.partnerPriority <= 0) {
      this.partnerPriority = 999;
    }

    this.updatedAt = OffsetDateTime.now();
  }

  public void reject() {
    this.status = "REJECTED";
    this.active = false;
    this.partner = false;
    this.partnerPriority = 0;
    this.updatedAt = OffsetDateTime.now();
  }

  public void returned() {
    this.status = "RETURNED";
    this.active = false;
    this.partner = false;
    this.partnerPriority = 0;
    this.updatedAt = OffsetDateTime.now();
  }

  public void updateFrom(
          String name,
          String businessRegistrationNumber,
          String representativeName,
          String phone,
          String email,
          String addressLine,
          String postalCode,
          String serviceRegionLabel,
          Double latitude,
          Double longitude,
          Set<IssueType> specialties,
          Integer minEstimatedQuoteKrw,
          Integer maxEstimatedQuoteKrw,
          String capabilityNote,
          Boolean active,
          String adminMemo
  ) {
    if (name != null) this.name = name;
    if (businessRegistrationNumber != null) this.businessRegistrationNumber = businessRegistrationNumber;
    if (representativeName != null) this.representativeName = representativeName;
    if (phone != null) this.phone = phone;
    if (email != null) this.email = email;
    if (addressLine != null) this.addressLine = addressLine;
    if (postalCode != null) this.postalCode = postalCode;
    if (serviceRegionLabel != null) this.serviceRegionLabel = serviceRegionLabel;
    if (latitude != null) this.latitude = latitude;
    if (longitude != null) this.longitude = longitude;

    if (specialties != null) {
      this.specialties.clear();
      this.specialties.addAll(specialties);
    }

    if (minEstimatedQuoteKrw != null) this.minEstimatedQuoteKrw = minEstimatedQuoteKrw;
    if (maxEstimatedQuoteKrw != null) this.maxEstimatedQuoteKrw = maxEstimatedQuoteKrw;
    if (capabilityNote != null) this.capabilityNote = capabilityNote;
    if (active != null) this.active = active;
    if (adminMemo != null) this.adminMemo = adminMemo;

    this.updatedAt = OffsetDateTime.now();
  }
}