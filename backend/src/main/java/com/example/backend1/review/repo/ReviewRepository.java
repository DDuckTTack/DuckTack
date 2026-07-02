package com.example.backend1.review.repo;

import com.example.backend1.company.domain.Company;
import com.example.backend1.review.domain.Review;
import com.example.backend1.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    List<Review> findAllByOrderByCreatedAtDesc();

    Optional<Review> findByIdAndUserUsername(Long id, String username);

    /**
     * 기존 구버전 리뷰 중복 검사 코드 호환용.
     * 현재 리뷰 기준은 historyId지만, 예전 서비스 코드나 일부 기능에서 아직 호출할 수 있어 남겨둔다.
     */
    boolean existsByCompanyAndUser(Company company, User user);

    /**
     * 현재 리뷰 중복 기준: 하나의 히스토리에는 리뷰 1개만 허용.
     */
    boolean existsByHistoryId(Long historyId);

    long countByUserId(Long userId);

    @Query("SELECT r.company.id, AVG(r.rating), COUNT(r) FROM Review r " +
            "WHERE r.company.id IN :companyIds GROUP BY r.company.id")
    List<Object[]> aggregateByCompanyIds(@Param("companyIds") List<Long> companyIds);
}