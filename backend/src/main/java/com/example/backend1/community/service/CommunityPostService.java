package com.example.backend1.community.service;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.community.domain.BoardType;
import com.example.backend1.community.domain.CommunityComment;
import com.example.backend1.community.domain.CommunityPost;
import com.example.backend1.community.domain.CommunityPostLike;
import com.example.backend1.community.domain.CommunityReport;
import com.example.backend1.community.domain.CommunityStatus;
import com.example.backend1.community.domain.ReportTargetType;
import com.example.backend1.community.dto.CommunityPostDtos;
import com.example.backend1.community.repo.CommunityCommentRepository;
import com.example.backend1.community.repo.CommunityPostLikeRepository;
import com.example.backend1.community.repo.CommunityPostRepository;
import com.example.backend1.community.repo.CommunityReportRepository;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.domain.UserRole;
import com.example.backend1.user.repo.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
public class CommunityPostService {

    private final CommunityPostRepository communityPostRepository;
    private final CommunityCommentRepository communityCommentRepository;
    private final CommunityPostLikeRepository communityPostLikeRepository;
    private final CommunityReportRepository communityReportRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public CommunityPostService(
            CommunityPostRepository communityPostRepository,
            CommunityCommentRepository communityCommentRepository,
            CommunityPostLikeRepository communityPostLikeRepository,
            CommunityReportRepository communityReportRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper
    ) {
        this.communityPostRepository = communityPostRepository;
        this.communityCommentRepository = communityCommentRepository;
        this.communityPostLikeRepository = communityPostLikeRepository;
        this.communityReportRepository = communityReportRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Page<CommunityPostDtos.PostListResponse> list(
            BoardType boardType,
            String keyword,
            String regionCode,
            int page,
            int size,
            String sort,
            Authentication authentication
    ) {
        String username = currentUsername(authentication);
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size));
        return communityPostRepository
                .searchActive(
                        CommunityStatus.ACTIVE,
                        boardType,
                        blankToEmpty(keyword),
                        blankToNull(regionCode),
                        normalizeSortKey(sort),
                        pageable
                )
                .map(post -> toListResponse(post, username));
    }

    @Transactional
    public CommunityPostDtos.PostDetailResponse detail(Long postId, Authentication authentication) {
        CommunityPost post = getActivePost(postId);
        post.increaseViewCount();
        return toDetailResponse(post, currentUsername(authentication));
    }

    @Transactional(readOnly = true)
    public void ensureReadable(Long postId) {
        getActivePost(postId);
    }

    @Transactional(readOnly = true)
    public List<CommunityPostDtos.CommentResponse> comments(Long postId, Authentication authentication) {
        ensureReadable(postId);
        String username = currentUsername(authentication);
        return communityCommentRepository.findByPostIdOrderByCreatedAtAsc(postId)
                .stream()
                .map(comment -> toCommentResponse(comment, username))
                .toList();
    }

    @Transactional
    public CommunityPostDtos.CommentResponse createComment(
            Long postId,
            CommunityPostDtos.CommentRequest request,
            Authentication authentication
    ) {
        User author = currentUser(authentication);
        CommunityPost post = getActivePost(postId);
        String content = requireLength(request.content(), "댓글", 1, 1000);

        CommunityComment comment = communityCommentRepository.save(new CommunityComment(post, author, content));
        post.increaseCommentCount();

        return toCommentResponse(comment, author.getUsername());
    }

    @Transactional
    public CommunityPostDtos.CommentResponse updateComment(
            Long commentId,
            CommunityPostDtos.CommentRequest request,
            Authentication authentication
    ) {
        User currentUser = currentUser(authentication);
        CommunityComment comment = getComment(commentId);
        assertEditable(comment.getAuthor(), currentUser);
        comment.update(requireLength(request.content(), "댓글", 1, 1000));
        return toCommentResponse(comment, currentUser.getUsername());
    }

    @Transactional
    public void deleteComment(Long commentId, Authentication authentication) {
        User currentUser = currentUser(authentication);
        CommunityComment comment = getComment(commentId);
        assertEditable(comment.getAuthor(), currentUser);
        comment.getPost().decreaseCommentCount();
        communityCommentRepository.delete(comment);
    }

    @Transactional
    public CommunityPostDtos.PostDetailResponse create(
            CommunityPostDtos.PostCreateRequest request,
            Authentication authentication
    ) {
        User author = currentUser(authentication);
        validatePost(request.boardType(), request.title(), request.content(),
                request.regionCode(), request.regionName(), request.productName());

        CommunityPost post = new CommunityPost(
                author,
                request.boardType(),
                request.title().trim(),
                request.content().trim(),
                blankToNull(request.regionCode()),
                blankToNull(request.regionName()),
                blankToNull(request.productName())
        );

        return toDetailResponse(communityPostRepository.save(post), author.getUsername());
    }

    @Transactional
    public CommunityPostDtos.PostDetailResponse createFromMultipartRequest(
            String requestJson,
            Authentication authentication
    ) {
        return create(readJson(requestJson, CommunityPostDtos.PostCreateRequest.class), authentication);
    }

    @Transactional
    public CommunityPostDtos.PostDetailResponse update(
            Long postId,
            CommunityPostDtos.PostUpdateRequest request,
            Authentication authentication
    ) {
        User currentUser = currentUser(authentication);
        CommunityPost post = getActivePost(postId);
        assertEditable(post, currentUser);
        validatePost(request.boardType(), request.title(), request.content(),
                request.regionCode(), request.regionName(), request.productName());

        post.update(
                request.boardType(),
                request.title().trim(),
                request.content().trim(),
                blankToNull(request.regionCode()),
                blankToNull(request.regionName()),
                blankToNull(request.productName())
        );

        return toDetailResponse(post, currentUser.getUsername());
    }

    @Transactional
    public CommunityPostDtos.PostDetailResponse updateFromMultipartRequest(
            Long postId,
            String requestJson,
            Authentication authentication
    ) {
        return update(postId, readJson(requestJson, CommunityPostDtos.PostUpdateRequest.class), authentication);
    }

    @Transactional
    public void delete(Long postId, Authentication authentication) {
        User currentUser = currentUser(authentication);
        CommunityPost post = getActivePost(postId);
        assertEditable(post, currentUser);
        post.markDeleted();
    }

    @Transactional
    public CommunityPostDtos.LikeResponse like(Long postId, Authentication authentication) {
        User currentUser = currentUser(authentication);
        CommunityPost post = getActivePost(postId);

        if (!communityPostLikeRepository.existsByPostIdAndUserId(post.getId(), currentUser.getId())) {
            communityPostLikeRepository.save(new CommunityPostLike(post, currentUser));
            post.increaseLikeCount();
        }

        return new CommunityPostDtos.LikeResponse(post.getId(), post.getLikeCount(), true);
    }

    @Transactional
    public CommunityPostDtos.LikeResponse unlike(Long postId, Authentication authentication) {
        User currentUser = currentUser(authentication);
        CommunityPost post = getActivePost(postId);

        communityPostLikeRepository.findByPostIdAndUserId(post.getId(), currentUser.getId())
                .ifPresent(like -> {
                    communityPostLikeRepository.delete(like);
                    post.decreaseLikeCount();
                });

        return new CommunityPostDtos.LikeResponse(post.getId(), post.getLikeCount(), false);
    }

    @Transactional
    public CommunityPostDtos.ReportResponse report(
            CommunityPostDtos.ReportRequest request,
            Authentication authentication
    ) {
        User reporter = currentUser(authentication);
        ReportTargetType targetType = request.targetType();
        Long targetId = resolveReportTargetId(request);

        if (targetType == null || targetId == null || request.reason() == null) {
            throw new ApiException(ErrorCode.INVALID_INPUT);
        }
        if (targetType == ReportTargetType.POST) {
            getActivePost(targetId);
        } else {
            getComment(targetId);
        }
        if (communityReportRepository.existsByTargetTypeAndTargetIdAndReporterId(targetType, targetId, reporter.getId())) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "이미 신고한 항목입니다.");
        }

        CommunityReport report = communityReportRepository.save(new CommunityReport(
                targetType,
                targetId,
                reporter,
                request.reason(),
                truncate(blankToNull(request.detail()), 500)
        ));

        return new CommunityPostDtos.ReportResponse(
                report.getId(),
                report.getTargetType(),
                report.getTargetId(),
                report.getReason(),
                report.getCreatedAt()
        );
    }

    private CommunityPost getActivePost(Long postId) {
        return communityPostRepository.findByIdAndStatus(postId, CommunityStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_INPUT, "게시글을 찾을 수 없습니다."));
    }

    private void validatePost(BoardType boardType, String title, String content,
                              String regionCode, String regionName, String productName) {
        if (boardType == null) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "게시판을 선택해주세요.");
        }
        String cleanTitle = requireLength(title, "제목", 1, 100);
        String cleanContent = requireLength(content, "내용", 1, 3000);
        if (cleanTitle == null || cleanContent == null) {
            throw new ApiException(ErrorCode.INVALID_INPUT);
        }
        if (boardType == BoardType.LOCAL) {
            requireLength(regionCode, "지역 코드", 1, 50);
            requireLength(regionName, "지역명", 1, 100);
        }
        if (productName != null && productName.trim().length() > 120) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "제품명은 120자 이하로 입력해주세요.");
        }
    }

    private String requireLength(String value, String label, int min, int max) {
        String clean = blankToNull(value);
        if (clean == null || clean.length() < min) {
            throw new ApiException(ErrorCode.INVALID_INPUT, label + "을 입력해주세요.");
        }
        if (clean.length() > max) {
            throw new ApiException(ErrorCode.INVALID_INPUT, label + "은 " + max + "자 이하로 입력해주세요.");
        }
        return clean;
    }

    private void assertEditable(CommunityPost post, User currentUser) {
        assertEditable(post.getAuthor(), currentUser);
    }

    private void assertEditable(User owner, User currentUser) {
        boolean isAuthor = Objects.equals(owner.getId(), currentUser.getId());
        boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;
        if (!isAuthor && !isAdmin) {
            throw new ApiException(ErrorCode.ACCESS_DENIED);
        }
    }

    private User currentUser(Authentication authentication) {
        String username = currentUsername(authentication);
        if (username == null) {
            throw new ApiException(ErrorCode.AUTH_FAILED, "로그인이 필요합니다.");
        }
        return userRepository.findWithCompanyByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
    }

    private String currentUsername(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) return null;
        return authentication.getName();
    }

    private <T> T readJson(String requestJson, Class<T> type) {
        try {
            return objectMapper.readValue(requestJson, type);
        } catch (Exception e) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "요청 형식이 올바르지 않습니다.");
        }
    }

    private CommunityPostDtos.PostListResponse toListResponse(CommunityPost post, String username) {
        return new CommunityPostDtos.PostListResponse(
                post.getId(),
                post.getId(),
                post.getBoardType(),
                post.getTitle(),
                preview(post.getContent()),
                post.getAuthor().getId(),
                post.getAuthor().getUsername(),
                post.getRegionName(),
                post.getProductName(),
                post.getViewCount(),
                post.getLikeCount(),
                post.getCommentCount(),
                likedByMe(post, username),
                post.getCreatedAt()
        );
    }

    private CommunityPostDtos.PostDetailResponse toDetailResponse(CommunityPost post, String username) {
        boolean editable = canEdit(post, username);
        return new CommunityPostDtos.PostDetailResponse(
                post.getId(),
                post.getId(),
                post.getBoardType(),
                post.getTitle(),
                post.getContent(),
                preview(post.getContent()),
                post.getAuthor().getId(),
                post.getAuthor().getUsername(),
                post.getRegionCode(),
                post.getRegionName(),
                post.getProductName(),
                post.getViewCount(),
                post.getLikeCount(),
                post.getCommentCount(),
                likedByMe(post, username),
                communityReportRepository.countByTargetTypeAndTargetId(ReportTargetType.POST, post.getId()),
                post.getStatus(),
                post.getCreatedAt(),
                post.getUpdatedAt(),
                editable,
                editable
        );
    }

    private CommunityPostDtos.CommentResponse toCommentResponse(CommunityComment comment, String username) {
        return new CommunityPostDtos.CommentResponse(
                comment.getId(),
                comment.getPost().getId(),
                comment.getContent(),
                comment.getAuthor().getId(),
                comment.getAuthor().getUsername(),
                comment.getCreatedAt(),
                comment.getUpdatedAt(),
                username != null && Objects.equals(comment.getAuthor().getUsername(), username),
                communityReportRepository.countByTargetTypeAndTargetId(ReportTargetType.COMMENT, comment.getId())
        );
    }

    private CommunityComment getComment(Long commentId) {
        return communityCommentRepository.findById(commentId)
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_INPUT, "댓글을 찾을 수 없습니다."));
    }

    private boolean canEdit(CommunityPost post, String username) {
        if (username == null) return false;
        if (Objects.equals(post.getAuthor().getUsername(), username)) return true;
        return userRepository.findByUsername(username)
                .map(user -> user.getRole() == UserRole.ADMIN)
                .orElse(false);
    }

    private boolean likedByMe(CommunityPost post, String username) {
        if (username == null) return false;
        return userRepository.findByUsername(username)
                .map(user -> communityPostLikeRepository.existsByPostIdAndUserId(post.getId(), user.getId()))
                .orElse(false);
    }

    private Long resolveReportTargetId(CommunityPostDtos.ReportRequest request) {
        if (request.targetType() == ReportTargetType.POST) {
            return request.targetId() != null ? request.targetId() : request.postId();
        }
        if (request.targetType() == ReportTargetType.COMMENT) {
            return request.targetId() != null ? request.targetId() : request.commentId();
        }
        return null;
    }

    private String truncate(String value, int max) {
        if (value == null || value.length() <= max) return value;
        return value.substring(0, max);
    }

    private String preview(String content) {
        if (content == null) return "";
        String normalized = content.replaceAll("\\s+", " ").trim();
        return normalized.length() <= 90 ? normalized : normalized.substring(0, 90) + "...";
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private String blankToEmpty(String value) {
        if (value == null || value.isBlank()) return "";
        return value.trim();
    }

    private int clampSize(int size) {
        if (size < 1) return 20;
        return Math.min(size, 100);
    }

    private String normalizeSortKey(String sort) {
        String normalized = sort == null ? "latest" : sort.trim().toLowerCase();
        return switch (normalized) {
            case "views", "view" -> "views";
            case "likes", "like", "popular" -> "likes";
            default -> "latest";
        };
    }
}
