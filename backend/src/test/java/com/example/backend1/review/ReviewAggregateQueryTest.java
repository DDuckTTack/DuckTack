package com.example.backend1.review;

import com.example.backend1.company.domain.Company;
import com.example.backend1.company.repo.CompanyRepository;
import com.example.backend1.diagnosis.domain.AnalysisStatus;
import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.history.repo.HistoryRepository;
import com.example.backend1.history.service.HistoryEntity;
import com.example.backend1.review.domain.Review;
import com.example.backend1.review.repo.ReviewRepository;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.repo.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 입찰 상세의 업체 평점을 "업체마다 리뷰 전체 조회"(기존)에서 집계 쿼리 1회(신규)로 바꿨다.
 * 집계 결과가 기존 계산 방식과 동일한지 실제 DB에서 검증한다.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
// ddl-auto는 application.yml의 update를 그대로 쓴다. none으로 두면 스키마가 이미 있는 DB에서만
// 통과해서, 빈 DB(CI)에서는 다른 테스트가 먼저 스키마를 만들어줬는지에 따라 결과가 달라진다.
class ReviewAggregateQueryTest {

    @Autowired private UserRepository userRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private HistoryRepository historyRepository;
    @Autowired private ReviewRepository reviewRepository;

    private User newUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return userRepository.save(new User("r_" + suffix, "hash", "010" + suffix.substring(0, 8)));
    }

    private void writeReview(Company company, int rating) {
        User author = newUser();
        HistoryEntity history = historyRepository.save(
                new HistoryEntity(author, null, AnalysisStatus.COMPLETED, 50, IssueType.ETC));
        reviewRepository.saveAndFlush(new Review(company, author, history, rating, "리뷰 " + rating));
    }

    /** 기존 구현: 업체의 리뷰를 전부 읽어 평균과 개수를 계산했다. */
    private double[] legacyStats(Long companyId) {
        List<Review> reviews = reviewRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        return new double[]{Math.round(avg * 10.0) / 10.0, reviews.size()};
    }

    private Map<Long, double[]> aggregateStats(List<Long> companyIds) {
        Map<Long, double[]> stats = new HashMap<>();
        for (Object[] row : reviewRepository.aggregateByCompanyIds(companyIds)) {
            double avg = ((Number) row[1]).doubleValue();
            stats.put(((Number) row[0]).longValue(),
                    new double[]{Math.round(avg * 10.0) / 10.0, ((Number) row[2]).intValue()});
        }
        return stats;
    }

    @Test
    void 집계쿼리_결과가_기존_계산방식과_같다() {
        Company manyReviews = companyRepository.saveAndFlush(new Company("업체A"));
        Company oneReview = companyRepository.saveAndFlush(new Company("업체B"));
        Company noReview = companyRepository.saveAndFlush(new Company("업체C"));

        // 평균이 딱 떨어지지 않는 값으로 반올림까지 확인한다. (4,5,5 -> 4.666... -> 4.7)
        writeReview(manyReviews, 4);
        writeReview(manyReviews, 5);
        writeReview(manyReviews, 5);
        writeReview(oneReview, 3);

        List<Long> ids = List.of(manyReviews.getId(), oneReview.getId(), noReview.getId());
        Map<Long, double[]> aggregated = aggregateStats(ids);

        assertThat(aggregated.get(manyReviews.getId())).containsExactly(4.7, 3.0);
        assertThat(aggregated.get(oneReview.getId())).containsExactly(3.0, 1.0);

        // 리뷰가 없는 업체는 집계 결과에 아예 없어야 하고, 서비스는 0.0/0으로 대체한다.
        assertThat(aggregated).doesNotContainKey(noReview.getId());

        // 기존 방식과 대조
        for (Long id : ids) {
            double[] expected = legacyStats(id);
            double[] actual = aggregated.getOrDefault(id, new double[]{0.0, 0.0});
            assertThat(actual)
                    .as("업체 %d 의 평점 집계가 기존 방식과 달라짐", id)
                    .containsExactly(expected[0], expected[1]);
        }
    }
}
