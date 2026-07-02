package com.example.backend1.admin.service;

import com.example.backend1.admin.dto.AdminCompanyDtos;
import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.company.domain.Company;
import com.example.backend1.company.repo.CompanyRepository;
import com.example.backend1.company.service.NaverSearchClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;

@Service
public class AdminCompanyService {

  private static final Logger log = LoggerFactory.getLogger(AdminCompanyService.class);

  private final CompanyRepository companyRepository;
  private final NaverSearchClient naverSearchClient;

  public AdminCompanyService(CompanyRepository companyRepository,
                             NaverSearchClient naverSearchClient) {
    this.companyRepository = companyRepository;
    this.naverSearchClient = naverSearchClient;
  }

  private record Coord(Double lat, Double lng) {}

  @Transactional
  public AdminCompanyDtos.CompanyResponse create(AdminCompanyDtos.CreateRequest req) {
    validateQuoteRange(req.minEstimatedQuoteKrw(), req.maxEstimatedQuoteKrw());

    Company c = new Company(req.name());
    applyCreate(c, req);

    if (Boolean.FALSE.equals(req.active())) {
      c.markSignupPending(null);
    } else {
      c.approvePartner();
    }

    return toResponse(companyRepository.save(c));
  }

  @Transactional(readOnly = true)
  public Page<AdminCompanyDtos.CompanyListItem> list(Boolean activeOnly, Pageable pageable) {
    Page<Company> page;

    if (Boolean.TRUE.equals(activeOnly)) {
      page = companyRepository.findByActive(true, pageable);
    } else {
      page = companyRepository.findAll(pageable);
    }

    return page.map(this::toListItem);
  }

  @Transactional(readOnly = true)
  public AdminCompanyDtos.CompanyResponse get(Long id) {
    return toResponse(companyRepository.findById(id)
            .orElseThrow(() -> new ApiException(ErrorCode.COMPANY_NOT_FOUND)));
  }

  @Transactional
  public AdminCompanyDtos.CompanyResponse update(Long id, AdminCompanyDtos.UpdateRequest req) {
    Company c = companyRepository.findById(id)
            .orElseThrow(() -> new ApiException(ErrorCode.COMPANY_NOT_FOUND));

    Integer newMin = req.minEstimatedQuoteKrw() != null
            ? req.minEstimatedQuoteKrw()
            : c.getMinEstimatedQuoteKrw();

    Integer newMax = req.maxEstimatedQuoteKrw() != null
            ? req.maxEstimatedQuoteKrw()
            : c.getMaxEstimatedQuoteKrw();

    validateQuoteRange(newMin, newMax);

    String effectiveAddress = req.addressLine() != null
            ? req.addressLine()
            : c.getAddressLine();

    Coord coord = resolveCoordinates(req.latitude(), req.longitude(), effectiveAddress);

    c.updateFrom(
            req.name(),
            req.businessRegistrationNumber(),
            req.representativeName(),
            req.phone(),
            req.email(),
            req.addressLine(),
            req.postalCode(),
            req.serviceRegionLabel(),
            coord.lat(),
            coord.lng(),
            req.specialties(),
            req.minEstimatedQuoteKrw(),
            req.maxEstimatedQuoteKrw(),
            req.capabilityNote(),
            req.active(),
            req.adminMemo()
    );

    return toResponse(companyRepository.save(c));
  }

  @Transactional
  public AdminCompanyDtos.CompanyResponse setActive(Long id, boolean active) {
    Company c = companyRepository.findById(id)
            .orElseThrow(() -> new ApiException(ErrorCode.COMPANY_NOT_FOUND));

    if (active) {
      c.approvePartner();
    } else {
      c.markSignupPending(c.getUsername());
    }

    return toResponse(companyRepository.save(c));
  }

  @Transactional
  public AdminCompanyDtos.CompanyResponse setStatus(Long id, String status) {
    Company c = companyRepository.findById(id)
            .orElseThrow(() -> new ApiException(ErrorCode.COMPANY_NOT_FOUND));

    if (status == null || status.isBlank()) {
      throw new ApiException(ErrorCode.INVALID_INPUT, "업체 상태값이 비어 있습니다.");
    }

    String normalized = status.trim().toUpperCase();

    switch (normalized) {
      case "APPROVED" -> c.approvePartner();
      case "PENDING" -> c.markSignupPending(c.getUsername());
      case "REJECTED" -> c.reject();
      case "RETURNED" -> c.returned();
      default -> throw new ApiException(ErrorCode.INVALID_INPUT, "지원하지 않는 업체 상태입니다: " + status);
    }

    return toResponse(companyRepository.save(c));
  }

  private void applyCreate(Company c, AdminCompanyDtos.CreateRequest req) {
    Coord coord = resolveCoordinates(req.latitude(), req.longitude(), req.addressLine());

    c.updateFrom(
            req.name(),
            req.businessRegistrationNumber(),
            req.representativeName(),
            req.phone(),
            req.email(),
            req.addressLine(),
            req.postalCode(),
            req.serviceRegionLabel(),
            coord.lat(),
            coord.lng(),
            req.specialties() != null ? new HashSet<>(req.specialties()) : new HashSet<>(),
            req.minEstimatedQuoteKrw(),
            req.maxEstimatedQuoteKrw(),
            req.capabilityNote(),
            req.active() != null ? req.active() : true,
            req.adminMemo()
    );
  }

  private Coord resolveCoordinates(Double reqLat, Double reqLng, String addressLine) {
    if (reqLat != null && reqLng != null) {
      return new Coord(reqLat, reqLng);
    }

    if (addressLine == null || addressLine.isBlank()) {
      return new Coord(reqLat, reqLng);
    }

    try {
      Map<String, Object> body = naverSearchClient.getGeocode(addressLine.trim());

      if (body == null) {
        log.warn("[AdminCompanyService] Geocoding body=null. address='{}'", addressLine);
        return new Coord(reqLat, reqLng);
      }

      Object addrObj = body.get("addresses");

      if (!(addrObj instanceof List<?> list) || list.isEmpty()) {
        log.warn("[AdminCompanyService] Geocoding no results. address='{}', status={}",
                addressLine, body.get("status"));
        return new Coord(reqLat, reqLng);
      }

      Object first = list.get(0);

      if (!(first instanceof Map<?, ?> m)) {
        return new Coord(reqLat, reqLng);
      }

      Object xObj = m.get("x");
      Object yObj = m.get("y");

      if (xObj == null || yObj == null) {
        return new Coord(reqLat, reqLng);
      }

      double lat = Double.parseDouble(String.valueOf(yObj));
      double lng = Double.parseDouble(String.valueOf(xObj));

      log.info("[AdminCompanyService] Geocoded '{}' -> lat={}, lng={}", addressLine, lat, lng);

      Double finalLat = reqLat != null ? reqLat : lat;
      Double finalLng = reqLng != null ? reqLng : lng;

      return new Coord(finalLat, finalLng);
    } catch (Exception e) {
      log.warn("[AdminCompanyService] Geocoding failed, keep nulls. address='{}', cause={}",
              addressLine, e.toString());
      return new Coord(reqLat, reqLng);
    }
  }

  private void validateQuoteRange(Integer min, Integer max) {
    if (min != null && max != null && min > max) {
      throw new ApiException(ErrorCode.INVALID_INPUT, "예상 견적 하한이 상한보다 클 수 없습니다.");
    }
  }

  private AdminCompanyDtos.CompanyListItem toListItem(Company c) {
    return new AdminCompanyDtos.CompanyListItem(
            c.getId(),
            c.getUsername(),
            c.getName(),
            formatListAddress(c),
            c.getServiceRegionLabel(),
            c.isActive(),
            c.getStatus(),
            c.isPartner(),
            c.getPartnerPriority(),
            c.getCreatedAt()
    );
  }

  private static String formatListAddress(Company c) {
    String pc = c.getPostalCode();
    String line = c.getAddressLine();

    boolean hasPc = pc != null && !pc.isBlank();
    boolean hasLine = line != null && !line.isBlank();

    if (hasPc && hasLine) {
      return "[" + pc + "] " + line;
    }

    if (hasLine) {
      return line;
    }

    if (hasPc) {
      return pc;
    }

    return null;
  }

  private AdminCompanyDtos.CompanyResponse toResponse(Company c) {
    return new AdminCompanyDtos.CompanyResponse(
            c.getId(),
            c.getUsername(),
            c.getName(),
            c.getBusinessRegistrationNumber(),
            c.getRepresentativeName(),
            c.getPhone(),
            c.getEmail(),
            c.getAddressLine(),
            c.getPostalCode(),
            c.getServiceRegionLabel(),
            c.getLatitude(),
            c.getLongitude(),
            new HashSet<>(c.getSpecialties()),
            c.getMinEstimatedQuoteKrw(),
            c.getMaxEstimatedQuoteKrw(),
            c.getCapabilityNote(),
            c.isActive(),
            c.getStatus(),
            c.isPartner(),
            c.getPartnerPriority(),
            c.getAdminMemo(),
            c.getCreatedAt(),
            c.getUpdatedAt()
    );
  }
}