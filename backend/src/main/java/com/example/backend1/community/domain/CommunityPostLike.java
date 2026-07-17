package com.example.backend1.community.domain;

import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "community_post_likes",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_community_post_likes_post_user", columnNames = {"post_id", "user_id"})
        },
        indexes = {
                @Index(name = "idx_community_post_likes_post_id", columnList = "post_id"),
                @Index(name = "idx_community_post_likes_user_id", columnList = "user_id")
        }
)
public class CommunityPostLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private CommunityPost post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected CommunityPostLike() {
    }

    public CommunityPostLike(CommunityPost post, User user) {
        this.post = post;
        this.user = user;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public CommunityPost getPost() { return post; }
    public User getUser() { return user; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
