package com.example.backend1.community.domain;

import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "community_posts",
        indexes = {
                @Index(name = "idx_community_posts_board_type", columnList = "board_type"),
                @Index(name = "idx_community_posts_author_id", columnList = "author_id"),
                @Index(name = "idx_community_posts_status", columnList = "status"),
                @Index(name = "idx_community_posts_created_at", columnList = "created_at"),
                @Index(name = "idx_community_posts_region_code", columnList = "region_code")
        }
)
public class CommunityPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(name = "board_type", nullable = false, length = 30)
    private BoardType boardType;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 3000, columnDefinition = "TEXT")
    private String content;

    @Column(name = "region_code", length = 50)
    private String regionCode;

    @Column(name = "region_name", length = 100)
    private String regionName;

    @Column(name = "product_name", length = 120)
    private String productName;

    @Column(name = "view_count", nullable = false)
    private int viewCount = 0;

    @Column(name = "like_count", nullable = false, columnDefinition = "integer default 0")
    private int likeCount = 0;

    @Column(name = "comment_count", nullable = false)
    private int commentCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CommunityStatus status = CommunityStatus.ACTIVE;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    protected CommunityPost() {
    }

    public CommunityPost(User author, BoardType boardType, String title, String content,
                         String regionCode, String regionName, String productName) {
        this.author = author;
        this.boardType = boardType;
        this.title = title;
        this.content = content;
        this.regionCode = regionCode;
        this.regionName = regionName;
        this.productName = productName;
    }

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (status == null) status = CommunityStatus.ACTIVE;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public void update(BoardType boardType, String title, String content,
                       String regionCode, String regionName, String productName) {
        this.boardType = boardType;
        this.title = title;
        this.content = content;
        this.regionCode = regionCode;
        this.regionName = regionName;
        this.productName = productName;
    }

    public void increaseViewCount() {
        this.viewCount++;
    }

    public void increaseCommentCount() {
        this.commentCount++;
    }

    public void increaseLikeCount() {
        this.likeCount++;
    }

    public void decreaseLikeCount() {
        if (this.likeCount > 0) {
            this.likeCount--;
        }
    }

    public void decreaseCommentCount() {
        if (this.commentCount > 0) {
            this.commentCount--;
        }
    }

    public void markDeleted() {
        this.status = CommunityStatus.DELETED;
    }

    public Long getId() { return id; }
    public User getAuthor() { return author; }
    public BoardType getBoardType() { return boardType; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public String getRegionCode() { return regionCode; }
    public String getRegionName() { return regionName; }
    public String getProductName() { return productName; }
    public int getViewCount() { return viewCount; }
    public int getLikeCount() { return likeCount; }
    public int getCommentCount() { return commentCount; }
    public CommunityStatus getStatus() { return status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
