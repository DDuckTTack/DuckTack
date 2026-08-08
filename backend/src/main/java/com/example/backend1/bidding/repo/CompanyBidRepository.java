package com.example.backend1.bidding.repo;

import com.example.backend1.bidding.domain.CompanyBid;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CompanyBidRepository extends JpaRepository<CompanyBid, Long> {
    List<CompanyBid> findByBidRequestIdOrderByPriceAsc(Long bidRequestId);
    Optional<CompanyBid> findByBidRequestIdAndCompanyId(Long bidRequestId, Long companyId);
    List<CompanyBid> findByCompanyIdOrderByUpdatedAtDesc(Long companyId);
}
