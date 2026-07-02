package com.example.backend1.review.domain;

import com.example.backend1.company.domain.Company;
import com.example.backend1.history.service.HistoryEntity;
import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "reviews",
        indexes = {
                @Index(name = "idx_reviews_company_id", columnList = "company_id"),
                @Index(name = "idx_reviews_history_id", columnList = "history_id")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_reviews_history", columnNames = {"history_id"})
        }
)
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 리뷰가 달린 업체.
     * 업체별 리뷰 조회/평균 계산을 위해 유지.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    /**
     * 리뷰 작성자.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 리뷰 기준 히스토리.
     * 핵심: 같은 history_id로는 리뷰 1개만 가능.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "history_id", nullable = false)
    private HistoryEntity history;

    @Column(nullable = false)
    private int rating;

    @Column(length = 1000)
    private String content;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected Review() {}

    public Review(Company company, User user, HistoryEntity history, int rating, String content) {
        this.company = company;
        this.user = user;
        this.history = history;
        this.rating = rating;
        this.content = content;
    }

    public Long getId() {
        return id;
    }

    public Company getCompany() {
        return company;
    }

    public User getUser() {
        return user;
    }

    public HistoryEntity getHistory() {
        return history;
    }

    public int getRating() {
        return rating;
    }

    public String getContent() {
        return content;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void update(int rating, String content) {
        this.rating = rating;
        this.content = content;
    }
}