package com.example.backend1.community.repo;

import com.example.backend1.community.domain.CommunityComment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommunityCommentRepository extends JpaRepository<CommunityComment, Long> {

    @EntityGraph(attributePaths = {"author", "post"})
    List<CommunityComment> findByPostIdOrderByCreatedAtAsc(Long postId);
}
