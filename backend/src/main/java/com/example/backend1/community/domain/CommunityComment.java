package com.example.backend1.community.domain;

import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "community_comments",
        indexes = {
                @Index(name = "idx_community_comments_post_id", columnList = "post_id"),
                @Index(name = "idx_community_comments_author_id", columnList = "author_id"),
                @Index(name = "idx_community_comments_created_at", columnList = "created_at")
        }
)
public class CommunityComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private CommunityPost post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, length = 1000)
    private String content;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    protected CommunityComment() {
    }

    public CommunityComment(CommunityPost post, User author, String content) {
        this.post = post;
        this.author = author;
        this.content = content;
    }

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public void update(String content) {
        this.content = content;
    }

    public Long getId() { return id; }
    public CommunityPost getPost() { return post; }
    public User getAuthor() { return author; }
    public String getContent() { return content; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
