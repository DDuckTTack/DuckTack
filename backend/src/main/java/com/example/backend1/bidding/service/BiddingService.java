package com.example.backend1.bidding.service;

import com.example.backend1.bidding.domain.BidRequest;
import com.example.backend1.bidding.domain.CompanyBid;
import com.example.backend1.bidding.dto.BiddingDtos;
import com.example.backend1.bidding.repo.BidRequestRepository;
import com.example.backend1.bidding.repo.CompanyBidRepository;
import com.example.backend1.company.domain.Company;
import com.example.backend1.history.repo.HistoryRepository;
import com.example.backend1.history.service.HistoryEntity;
import com.example.backend1.review.repo.ReviewRepository;
import com.example.backend1.realtime.RealtimeEventPublisher;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.repo.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@Transactional
public class BiddingService {
    private final BidRequestRepository requestRepository;
    private final CompanyBidRepository bidRepository;
    private final HistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;

    public BiddingService(BidRequestRepository requestRepository, CompanyBidRepository bidRepository,
                          HistoryRepository historyRepository, UserRepository userRepository,
                          ReviewRepository reviewRepository,
                          RealtimeEventPublisher realtimeEventPublisher) {
        this.requestRepository = requestRepository;
        this.bidRepository = bidRepository;
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
    }

    public BiddingDtos.Item create(String username, BiddingDtos.CreateRequest req) {
        User user = requireUser(username);
        if (req.historyId() == null) throw new IllegalArgumentException("진단 이력이 필요합니다.");
        HistoryEntity history = historyRepository.findById(req.historyId())
                .filter(h -> h.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new IllegalArgumentException("진단 이력을 찾을 수 없습니다."));
        if (req.deadline() == null || req.deadline().isBefore(OffsetDateTime.now().plusMinutes(5))) {
            throw new IllegalArgumentException("입찰 마감은 현재로부터 5분 이후여야 합니다.");
        }
        if (req.maxDistanceKm() != null && (req.maxDistanceKm() < 1 || req.maxDistanceKm() > 100)) {
            throw new IllegalArgumentException("최대 반경은 1~100km 사이여야 합니다.");
        }
        String address = req.address() == null || req.address().isBlank() ? user.getAddress() : req.address().trim();
        Double latitude = req.latitude() == null ? user.getLatitude() : req.latitude();
        Double longitude = req.longitude() == null ? user.getLongitude() : req.longitude();
        if (address == null || address.isBlank()) throw new IllegalArgumentException("작업 주소가 필요합니다.");
        BidRequest saved = requestRepository.save(new BidRequest(
                user, history, address, latitude, longitude, req.requestNote(), req.deadline(), req.maxDistanceKm()));
        realtimeEventPublisher.publishBidChange("BID_REQUEST_CREATED", saved.getId());
        return toItem(saved, null, true);
    }

    public List<BiddingDtos.Item> myRequests(String username) {
        return requestRepository.findByUserUsernameOrderByCreatedAtDesc(username).stream()
                .peek(BidRequest::expireIfNeeded)
                .map(r -> toItem(r, null, true))
                .toList();
    }

    public BiddingDtos.Item myRequest(String username, Long id) {
        BidRequest request = requestRepository.findByIdAndUserUsername(id, username)
                .orElseThrow(() -> new IllegalArgumentException("입찰 요청을 찾을 수 없습니다."));
        request.expireIfNeeded();
        return toItem(request, null, true);
    }

    public BiddingDtos.Item extendDeadline(String username, Long requestId, Integer minutes) {
        BidRequest request = requestRepository.findByIdAndUserUsername(requestId, username)
                .orElseThrow(() -> new IllegalArgumentException("입찰 요청을 찾을 수 없습니다."));
        request.expireIfNeeded();
        request.extendDeadline(minutes == null ? 0 : minutes);
        realtimeEventPublisher.publishBidChange("BID_REQUEST_UPDATED", request.getId());
        return toItem(request, null, true);
    }

    public BiddingDtos.Item widenRadius(String username, Long requestId, Integer maxDistanceKm) {
        BidRequest request = requestRepository.findByIdAndUserUsername(requestId, username)
                .orElseThrow(() -> new IllegalArgumentException("입찰 요청을 찾을 수 없습니다."));
        request.expireIfNeeded();
        request.widenMaxDistanceKm(maxDistanceKm);
        realtimeEventPublisher.publishBidChange("BID_REQUEST_UPDATED", request.getId());
        return toItem(request, null, true);
    }

    public BiddingDtos.SelectResponse select(String username, Long requestId, Long bidId) {
        BidRequest request = requestRepository.findByIdAndUserUsername(requestId, username)
                .orElseThrow(() -> new IllegalArgumentException("입찰 요청을 찾을 수 없습니다."));
        CompanyBid bid = bidRepository.findById(bidId)
                .filter(value -> value.getBidRequest().getId().equals(requestId))
                .orElseThrow(() -> new IllegalArgumentException("업체 입찰을 찾을 수 없습니다."));
        request.select(bid.getCompany());
        realtimeEventPublisher.publishBidChange("BID_SELECTED", request.getId());
        return new BiddingDtos.SelectResponse(requestId, bid.getCompany().getId(), bid.getCompany().getName(),
                bid.getPrice(), request.getHistory().getId());
    }

    public List<BiddingDtos.Item> companyOpportunities(String username) {
        Company company = requireCompany(username);
        return requestRepository.findByStatusOrderByCreatedAtDesc(BidRequest.Status.OPEN).stream()
                .peek(BidRequest::expireIfNeeded)
                .filter(BidRequest::isOpen)
                .map(r -> new DistanceRequest(r, distanceKm(company.getLatitude(), company.getLongitude(),
                        r.getLatitude(), r.getLongitude())))
                .filter(v -> v.distance != null && v.distance <= company.getBidRadiusKm()
                        && (v.request.getMaxDistanceKm() == null || v.distance <= v.request.getMaxDistanceKm()))
                .map(v -> toItem(v.request, v.distance, false, company))
                .toList();
    }

    public BiddingDtos.Offer submit(String username, Long requestId, BiddingDtos.SubmitBidRequest req) {
        Company company = requireCompany(username);
        BidRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("입찰 요청을 찾을 수 없습니다."));
        if (!request.isOpen()) throw new IllegalStateException("마감된 입찰입니다.");
        Double distance = distanceKm(company.getLatitude(), company.getLongitude(),
                request.getLatitude(), request.getLongitude());
        if (distance == null) {
            throw new IllegalArgumentException("업체 위치 정보가 없어 입찰할 수 없습니다. 업체 정보를 다시 확인해주세요.");
        }
        if (distance > company.getBidRadiusKm()) {
            throw new IllegalArgumentException("설정한 입찰 반경 밖의 요청입니다.");
        }
        if (request.getMaxDistanceKm() != null && distance > request.getMaxDistanceKm()) {
            throw new IllegalArgumentException("요청자가 지정한 반경 밖의 요청입니다.");
        }
        CompanyBid bid = bidRepository.findByBidRequestIdAndCompanyId(requestId, company.getId())
                .orElseGet(() -> new CompanyBid(request, company, req.price(), req.message()));
        bid.update(req.price(), req.message());
        bid = bidRepository.save(bid);
        realtimeEventPublisher.publishBidChange("BID_SUBMITTED", request.getId());
        return toOffer(bid, distance, request.getSelectedCompany());
    }

    public List<BiddingDtos.CompanyResult> companyResults(String username) {
        Company company = requireCompany(username);
        return bidRepository.findByCompanyIdOrderByUpdatedAtDesc(company.getId()).stream().map(bid -> {
            BidRequest request = bid.getBidRequest();
            request.expireIfNeeded();
            String result = request.getStatus() == BidRequest.Status.OPEN ? "WAITING"
                    : request.getSelectedCompany() != null && request.getSelectedCompany().getId().equals(company.getId())
                    ? "SUCCESS" : "FAILED";
            return new BiddingDtos.CompanyResult(bid.getId(), request.getId(), bid.getPrice(),
                    request.getHistory().getIssueType().name(), request.getDeadline(), result, bid.getUpdatedAt());
        }).toList();
    }

    public BiddingDtos.Radius radius(String username) {
        return new BiddingDtos.Radius(requireCompany(username).getBidRadiusKm());
    }

    public BiddingDtos.Radius updateRadius(String username, BiddingDtos.RadiusRequest req) {
        Company company = requireCompany(username);
        company.updateBidRadiusKm(req.radiusKm());
        return new BiddingDtos.Radius(company.getBidRadiusKm());
    }

    public List<BiddingDtos.AdminItem> adminRequests() {
        return requestRepository.findAllByOrderByCreatedAtDesc().stream().map(request -> {
            request.expireIfNeeded();
            HistoryEntity history = request.getHistory();
            String imageUrl = history.getDiagnosisResult() == null ? null : history.getDiagnosisResult().getImageUrl();
            List<BiddingDtos.Offer> offers = bidRepository.findByBidRequestIdOrderByPriceAsc(request.getId()).stream()
                    .map(bid -> toOffer(bid, distanceKm(request.getLatitude(), request.getLongitude(),
                            bid.getCompany().getLatitude(), bid.getCompany().getLongitude()), request.getSelectedCompany()))
                    .toList();
            Company selected = request.getSelectedCompany();
            return new BiddingDtos.AdminItem(request.getId(), history.getId(), request.getUser().getId(),
                    request.getUser().getUsername(), imageUrl, history.getIssueType().name(), history.getRiskScore(),
                    request.getAddress(), request.getRequestNote(), request.getDeadline(), request.getStatus().name(),
                    request.getCreatedAt(), request.getSelectedAt(), selected == null ? null : selected.getId(),
                    selected == null ? null : selected.getName(), offers);
        }).toList();
    }

    private BiddingDtos.Item toItem(BidRequest request, Double companyDistance, boolean includeOffers) {
        return toItem(request, companyDistance, includeOffers, null);
    }

    private BiddingDtos.Item toItem(BidRequest request, Double companyDistance,
                                    boolean includeOffers, Company viewingCompany) {
        HistoryEntity history = request.getHistory();
        String imageUrl = history.getDiagnosisResult() == null ? null : history.getDiagnosisResult().getImageUrl();
        List<BiddingDtos.Offer> offers = includeOffers
                ? bidRepository.findByBidRequestIdOrderByPriceAsc(request.getId()).stream()
                    .map(b -> toOffer(b, distanceKm(request.getLatitude(), request.getLongitude(),
                            b.getCompany().getLatitude(), b.getCompany().getLongitude()), request.getSelectedCompany()))
                    .toList()
                : List.of();
        CompanyBid myBid = viewingCompany == null ? null
                : bidRepository.findByBidRequestIdAndCompanyId(request.getId(), viewingCompany.getId()).orElse(null);
        return new BiddingDtos.Item(request.getId(), history.getId(), imageUrl,
                history.getIssueType().name(), history.getRiskScore(), maskName(request.getUser().getUsername()),
                request.getAddress(), companyDistance, request.getRequestNote(), request.getMaxDistanceKm(),
                request.getDeadline(), request.getStatus().name(), request.getCreatedAt(), offers,
                myBid == null ? null : myBid.getId(),
                myBid == null ? null : myBid.getPrice(),
                myBid == null ? null : myBid.getMessage());
    }

    private BiddingDtos.Offer toOffer(CompanyBid bid, Double distance, Company selected) {
        Company c = bid.getCompany();
        var reviews = reviewRepository == null ? List.<com.example.backend1.review.domain.Review>of()
                : reviewRepository.findByCompanyIdOrderByCreatedAtDesc(c.getId());
        double avg = reviews.stream().mapToInt(com.example.backend1.review.domain.Review::getRating)
                .average().orElse(0.0);
        return new BiddingDtos.Offer(bid.getId(), c.getId(), c.getName(), c.getPhone(), c.getAddressLine(),
                distance, Math.round(avg * 10.0) / 10.0, reviews.size(), bid.getPrice(), bid.getMessage(), bid.getCreatedAt(),
                selected != null && selected.getId().equals(c.getId()));
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    }

    private Company requireCompany(String username) {
        return userRepository.findWithCompanyByUsername(username)
                .map(User::getCompany)
                .orElseThrow(() -> new IllegalArgumentException("업체 계정이 아닙니다."));
    }

    private String maskName(String name) {
        if (name == null || name.isBlank()) return "사용자";
        return name.length() == 1 ? name + "*" : name.substring(0, 1) + "**";
    }

    private Double distanceKm(Double lat1, Double lon1, Double lat2, Double lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
        double earth = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return Math.round(earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10.0) / 10.0;
    }

    private record DistanceRequest(BidRequest request, Double distance) {}
}
