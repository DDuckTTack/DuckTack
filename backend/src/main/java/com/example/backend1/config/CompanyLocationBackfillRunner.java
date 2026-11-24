package com.example.backend1.config;

import com.example.backend1.company.domain.Company;
import com.example.backend1.company.repo.CompanyRepository;
import com.example.backend1.company.service.CompanyLocationResolver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * 좌표가 비었거나 서비스 지역이 "수원"처럼 앱 지역 라벨이 아닌 업체를 주소 기준으로 보정한다.
 * 가입 폼이 자유 입력이던 시절에 들어온 업체가 앱 업체 목록·입찰 요청에서 빠지는 문제를 막는다.
 * 이미 정상인 업체는 건드리지 않으므로 매 기동 때 돌아도 안전하다.
 */
@Component
public class CompanyLocationBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CompanyLocationBackfillRunner.class);

    private final CompanyRepository companyRepository;
    private final CompanyLocationResolver locationResolver;

    public CompanyLocationBackfillRunner(CompanyRepository companyRepository,
                                         CompanyLocationResolver locationResolver) {
        this.companyRepository = companyRepository;
        this.locationResolver = locationResolver;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            int fixed = 0;
            for (Company c : companyRepository.findAll()) {
                boolean noCoords = c.getLatitude() == null || c.getLongitude() == null;
                boolean badRegion = !CompanyLocationResolver.isKnownRegion(c.getServiceRegionLabel());
                if (!noCoords && !badRegion) continue;
                if (c.getAddressLine() == null || c.getAddressLine().isBlank()) continue;

                CompanyLocationResolver.Resolved r = locationResolver.resolve(c.getAddressLine());
                String region = badRegion ? r.regionLabel() : null;
                Double lat = noCoords ? r.lat() : null;
                Double lng = noCoords ? r.lng() : null;
                if (region == null && lat == null) continue;

                c.updateFrom(null, null, null, null, null, null, null,
                        region, lat, lng,
                        null, null, null, null, null, null);
                companyRepository.save(c);
                fixed++;
                log.info("[CompanyLocationBackfill] id={} name={} region={} -> {} coords=({}, {})",
                        c.getId(), c.getName(), c.getServiceRegionLabel(), region, lat, lng);
            }
            if (fixed > 0) log.info("[CompanyLocationBackfill] 업체 {}곳 위치 정보 보정", fixed);
        } catch (Exception e) {
            // 보정 실패가 서버 기동을 막으면 안 된다.
            log.warn("[CompanyLocationBackfill] 보정 중 오류 cause={}", e.toString());
        }
    }
}
