package com.example.backend1.auth;

import com.example.backend1.auth.dto.CompanySignupRequest;
import com.example.backend1.auth.dto.LoginRequest;
import com.example.backend1.company.domain.Company;
import com.example.backend1.company.repo.CompanyRepository;
import com.example.backend1.company.service.CompanyLocationResolver;
import com.example.backend1.diagnosis.domain.IssueType;
import com.example.backend1.security.JwtTokenProvider;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.domain.UserRole;
import com.example.backend1.user.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/company/auth")
@RequiredArgsConstructor
public class CompanyAuthController {
    private static final Logger log = LoggerFactory.getLogger(CompanyAuthController.class);

    private final UserRepository userRepo;
    private final CompanyRepository companyRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final CompanyLocationResolver locationResolver;

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest req) {

        User user = userRepo.findWithCompanyByUsername(req.username())
                .orElseThrow(() -> new RuntimeException("유저 없음"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new RuntimeException("비밀번호 틀림");
        }

        if (user.getRole() != UserRole.COMPANY) {
            throw new RuntimeException("업체 계정이 아닙니다.");
        }

        Company company = user.getCompany();

        if (company == null) {
            throw new RuntimeException("업체 정보 없음");
        }

        if (!company.isActive() || !company.isApproved()) {
            throw new RuntimeException("관리자 승인 후 로그인 가능합니다.");
        }

        String token = jwtTokenProvider.createAccessToken(
                null,
                user.getId(),
                user.getUsername()
        );

        return Map.of(
                "token", token,
                "role", user.getRole().name(),
                "companyId", company.getId()
        );
    }

    @PostMapping("/signup/company")
    public String signupCompany(@RequestBody CompanySignupRequest req) {

        if (req.username() == null || req.username().isBlank()) {
            throw new RuntimeException("아이디 필수");
        }

        if (req.password() == null || req.password().length() < 4) {
            throw new RuntimeException("비밀번호는 최소 4자 이상이어야 합니다");
        }

        if (req.companyName() == null || req.companyName().isBlank()) {
            throw new RuntimeException("업체명 필수");
        }

        if (req.phone() == null || req.phone().isBlank()) {
            throw new RuntimeException("계정 연락처 필수");
        }

        if (userRepo.findByUsername(req.username()).isPresent()) {
            throw new RuntimeException("이미 존재하는 아이디입니다");
        }

        Set<IssueType> specialties = new HashSet<>();

        if (req.specialties() != null) {
            for (String s : req.specialties()) {
                if (s == null || s.isBlank()) continue;
                specialties.add(parseIssueType(s));
            }
        }

        Company company = new Company(req.companyName());

        // 주소로 좌표와 지역(서울/경기/...)을 같이 정한다. 서비스 지역 칸이 "수원" 같은 자유 입력이어도
        // 앱 업체 목록·입찰 매칭이 동작하도록 주소에서 찾은 지역을 우선 쓴다.
        CompanyLocationResolver.Resolved location = locationResolver.resolve(req.address());
        String regionLabel = location.regionLabel() != null
                ? location.regionLabel()
                : (CompanyLocationResolver.regionLabelOf(req.serviceArea()) != null
                        ? CompanyLocationResolver.regionLabelOf(req.serviceArea())
                        : req.serviceArea());

        company.updateFrom(
                req.companyName(),
                req.businessNumber(),
                req.ownerName(),
                req.companyPhone(),
                req.email(),
                req.address(),
                req.zipCode(),
                regionLabel,
                location.lat(),
                location.lng(),
                specialties,
                null,
                null,
                null,
                false,
                "업체 회원가입 신청"
        );

        // 핵심: 회원가입 직후에는 승인 대기 상태
        company.markSignupPending(req.username());

        companyRepo.save(company);

        String encodedPw = passwordEncoder.encode(req.password());

        User user = new User(
                req.username(),
                encodedPw,
                req.phone(),
                UserRole.COMPANY,
                company
        );

        userRepo.save(user);

        return "업체 회원가입 완료 (관리자 승인 필요)";
    }

    private IssueType parseIssueType(String raw) {
        String v = raw.trim();

        return switch (v) {
            case "MOLD", "곰팡이" -> IssueType.MOLD;
            case "LEAK", "누수" -> IssueType.LEAK;
            case "CRACK", "균열" -> IssueType.CRACK;
            case "DAMAGE", "파손" -> IssueType.DAMAGE;
            case "ELECTRIC", "전기" -> IssueType.ELECTRIC;
            case "GAS", "가스" -> IssueType.GAS;
            default -> {
                try {
                    yield IssueType.valueOf(v);
                } catch (IllegalArgumentException e) {
                    throw new RuntimeException("잘못된 전문 분야 값: " + raw);
                }
            }
        };
    }
}