package com.example.backend1.bidding.repo;

import com.example.backend1.bidding.domain.BidRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BidRequestRepository extends JpaRepository<BidRequest, Long> {
    List<BidRequest> findByUserUsernameOrderByCreatedAtDesc(String username);
    Optional<BidRequest> findByIdAndUserUsername(Long id, String username);
    List<BidRequest> findByStatusOrderByCreatedAtDesc(BidRequest.Status status);
    List<BidRequest> findAllByOrderByCreatedAtDesc();
}
