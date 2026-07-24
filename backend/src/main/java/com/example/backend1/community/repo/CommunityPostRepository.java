package com.example.backend1.community.repo;

import com.example.backend1.community.domain.BoardType;
import com.example.backend1.community.domain.CommunityPost;
import com.example.backend1.community.domain.CommunityStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long> {

    @Query("""
            select p
            from CommunityPost p
            where p.status = :status
              and (:boardType is null or p.boardType = :boardType)
              and (:regionCode is null or p.regionCode = :regionCode)
              and (:keyword = ''
                   or lower(p.title) like lower(concat('%', :keyword, '%'))
                   or lower(p.content) like lower(concat('%', :keyword, '%')))
            order by
              case when :sortKey = 'views' then p.viewCount end desc,
              case when :sortKey = 'likes' then p.likeCount end desc,
              case when :sortKey = 'likes' then p.commentCount end desc,
              case when :sortKey = 'likes' then p.viewCount end desc,
              p.createdAt desc
            """)
    Page<CommunityPost> searchActive(
            @Param("status") CommunityStatus status,
            @Param("boardType") BoardType boardType,
            @Param("keyword") String keyword,
            @Param("regionCode") String regionCode,
            @Param("sortKey") String sortKey,
            Pageable pageable
    );

    @EntityGraph(attributePaths = "author")
    Optional<CommunityPost> findByIdAndStatus(Long id, CommunityStatus status);

    @EntityGraph(attributePaths = "author")
    Page<CommunityPost> findByAuthorIdAndStatusOrderByCreatedAtDesc(
            Long authorId,
            CommunityStatus status,
            Pageable pageable
    );

    @EntityGraph(attributePaths = "author")
    @Query("""
            select p
            from CommunityPost p
            where p.status = :status
              and exists (
                  select c.id
                  from CommunityComment c
                  where c.post = p
                    and c.author.id = :authorId
              )
            order by p.createdAt desc
            """)
    Page<CommunityPost> findCommentedPostsByAuthor(
            @Param("authorId") Long authorId,
            @Param("status") CommunityStatus status,
            Pageable pageable
    );
}
