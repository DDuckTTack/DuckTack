package com.example.backend1.community;

import com.example.backend1.community.domain.BoardType;
import com.example.backend1.community.domain.CommunityPost;
import com.example.backend1.community.repo.CommunityPostRepository;
import com.example.backend1.user.domain.RentType;
import com.example.backend1.user.domain.ResidenceType;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@ConditionalOnProperty(name = "app.seed.community-enabled", havingValue = "true")
public class CommunitySeedDataRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CommunitySeedDataRunner.class);
    private static final String DEMO_PASSWORD = "demo1234";

    private final CommunityPostRepository postRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public CommunitySeedDataRunner(
            CommunityPostRepository postRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<User> authors = List.of(
                demoUser("집수리초보", "community1@dduckttack.local", "010-9000-1001"),
                demoUser("서울자취생", "community2@dduckttack.local", "010-9000-1002"),
                demoUser("DIY고수", "community3@dduckttack.local", "010-9000-1003"),
                demoUser("우리동네수리", "community4@dduckttack.local", "010-9000-1004")
        );

        List<SeedPost> posts = List.of(
                new SeedPost(BoardType.FREE, "이사 후 첫 하자 점검은 어떻게 하세요?", "이번에 오래된 빌라로 이사했어요. 입주 초기에 꼭 확인해야 하는 하자 항목이 있다면 알려주세요.", null, null, null),
                new SeedPost(BoardType.FREE, "장마철 습기 관리 팁 공유해요", "환기를 자주 하고 제습기를 예약 운전하니 결로가 많이 줄었습니다. 다들 어떤 방법을 쓰시나요?", null, null, null),
                new SeedPost(BoardType.FREE, "집수리 견적 받을 때 확인할 점", "여러 업체의 작업 범위와 자재명을 같은 기준으로 비교하면 견적 차이를 이해하기 쉬웠어요.", null, null, null),
                new SeedPost(BoardType.FREE, "처음 가입했습니다 반가워요", "셀프 집수리 정보를 찾다가 가입했습니다. 유용한 정보 많이 나누고 싶어요.", null, null, null),

                new SeedPost(BoardType.LOCAL, "마포구 누수 탐지 업체 추천 부탁드려요", "주방 천장에 작은 물자국이 생겼습니다. 마포구에서 꼼꼼하게 봐주는 업체가 있을까요?", "SEOUL-MAPO", "서울 마포구", null),
                new SeedPost(BoardType.LOCAL, "수원 영통구 도배 경험 있으신 분", "부분 도배를 고민 중입니다. 최근 시공 경험과 대략적인 소요 시간이 궁금해요.", "GYEONGGI-SUWON", "경기 수원시", null),
                new SeedPost(BoardType.LOCAL, "부산 해운대 방충망 교체 정보", "미세 방충망으로 교체하려고 합니다. 바닷가 근처라 부식에 강한 제품 추천 부탁드립니다.", "BUSAN-HAEUNDAE", "부산 해운대구", null),
                new SeedPost(BoardType.LOCAL, "인천 부평 곰팡이 제거 후기 궁금해요", "베란다 벽면 곰팡이 제거와 단열 시공을 함께 해보신 분의 경험을 듣고 싶습니다.", "INCHEON-BUPYEONG", "인천 부평구", null),

                new SeedPost(BoardType.DIY_REVIEW, "욕실 실리콘 셀프 교체 성공 후기", "기존 실리콘을 완전히 제거하고 물기를 충분히 말린 뒤 작업하니 깔끔하게 마무리됐어요.", null, null, "욕실용 바이오 실리콘"),
                new SeedPost(BoardType.DIY_REVIEW, "벽지 곰팡이 제거제 사용 후기", "작은 범위에 먼저 테스트하고 환기하면서 사용했습니다. 얼룩이 많이 옅어졌어요.", null, null, "곰팡이 제거제"),
                new SeedPost(BoardType.DIY_REVIEW, "싱크대 문짝 경첩 직접 교체했어요", "규격을 먼저 확인하고 기존 나사 위치를 사진으로 남겨두니 20분 만에 교체했습니다.", null, null, "싱크대 댐핑 경첩"),
                new SeedPost(BoardType.DIY_REVIEW, "창틀 틈새 바람 막기 후기", "문풍지와 틈새 테이프를 함께 붙였더니 새벽에 들어오던 찬바람이 확실히 줄었어요.", null, null, "고밀도 문풍지"),

                new SeedPost(BoardType.PROMOTION, "누수 탐지 및 배관 점검 상담합니다", "열화상 장비와 청음 장비로 원인을 확인하고 작업 전 범위와 비용을 안내드립니다.", null, null, null),
                new SeedPost(BoardType.PROMOTION, "입주 전 하자 점검 예약 안내", "신축 아파트와 빌라 입주 전 점검을 진행합니다. 사진이 포함된 점검 결과를 제공합니다.", null, null, null),
                new SeedPost(BoardType.PROMOTION, "친환경 도배·부분 보수 가능합니다", "작은 벽면 부분 보수부터 전체 도배까지 상담 가능합니다. 현장 확인 후 견적을 안내드려요.", null, null, null),
                new SeedPost(BoardType.PROMOTION, "욕실 줄눈 및 실리콘 재시공", "오염된 줄눈과 들뜬 실리콘을 제거한 뒤 방수·방곰팡이 자재로 재시공합니다.", null, null, null),

                new SeedPost(BoardType.QNA, "천장 물자국이 생겼는데 어디부터 확인할까요?", "비가 온 다음 날 천장 모서리에 물자국이 보였습니다. 윗집과 외벽 중 무엇을 먼저 확인해야 할까요?", null, null, null),
                new SeedPost(BoardType.QNA, "결로와 누수를 구분하는 방법이 있나요?", "창문 주변 벽지가 젖는데 환기 후에는 마릅니다. 집에서 확인할 수 있는 구분 방법이 궁금합니다.", null, null, null),
                new SeedPost(BoardType.QNA, "타일 한 장만 교체해도 괜찮을까요?", "욕실 벽 타일 한 장에 금이 갔습니다. 부분 교체 시 방수층에 문제가 생길 수 있나요?", null, null, null),
                new SeedPost(BoardType.QNA, "벽에 난 작은 균열은 어떻게 관찰해야 하나요?", "도배지 위로 가느다란 균열이 보입니다. 폭이나 길이를 기록하는 좋은 방법을 알려주세요.", null, null, null)
        );

        int created = 0;
        for (int i = 0; i < posts.size(); i++) {
            SeedPost seed = posts.get(i);
            if (postRepository.existsByTitle(seed.title())) continue;
            User author = authors.get(i % authors.size());
            postRepository.save(new CommunityPost(
                    author,
                    seed.boardType(),
                    seed.title(),
                    seed.content(),
                    seed.regionCode(),
                    seed.regionName(),
                    seed.productName()
            ));
            created++;
        }

        log.info("Community demo seed completed: {} posts created", created);
    }

    private User demoUser(String username, String email, String phoneNumber) {
        return userRepository.findByUsername(username).orElseGet(() -> userRepository.save(new User(
                username,
                email,
                passwordEncoder.encode(DEMO_PASSWORD),
                phoneNumber,
                ResidenceType.APT,
                RentType.MONTHLY,
                "서울특별시",
                true,
                true,
                false
        )));
    }

    private record SeedPost(
            BoardType boardType,
            String title,
            String content,
            String regionCode,
            String regionName,
            String productName
    ) {}
}
