package com.example.backend1.community.repo;

import com.example.backend1.community.domain.CommunityPostLike;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CommunityPostLikeRepository extends JpaRepository<CommunityPostLike, Long> {
    boolean existsByPostIdAndUserId(Long postId, Long userId);
    Optional<CommunityPostLike> findByPostIdAndUserId(Long postId, Long userId);
}
