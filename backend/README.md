# Backend 1 (Core API & Auth)

## 포함 기능 (백엔드 1 역할)
- 회원가입/로그인, 아이디 중복 검사
- JWT 기반 인증/인가 (Bearer 토큰)
- 사용자 프로필 관리 (거주유형, 임대유형)
- 핵심 엔티티(User, Diagnosis, History, ReportMetadata) + 상태값(ANALYZING/COMPLETED/FAILED)
- 히스토리 목록/상세/필터(날짜/위험도/문제유형)/선택 삭제
- 공통 Response, 에러 코드, Validation, 예외 처리
- Swagger UI: `/swagger-ui.html`

## 실행
### Docker Compose (PostgreSQL)
```bash
docker compose up --build
```

### 환경변수
- `JWT_SECRET`: **운영에서는 반드시 변경** (최소 32바이트 권장)
- `CORS_ALLOWED_ORIGINS`: 프론트 도메인 허용 목록(쉼표 구분)
- `AI_BASE_URL`: AI 서버 주소

### 로컬 실행 (PostgreSQL)
1) PostgreSQL에 DB/계정 생성
- DB: `appdb`
- USER: `appuser` / PASS: `apppass` (환경변수 또는 `application.yml` 기본값)

2) 실행
```bash
./gradlew bootRun
```

## 주요 API
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET  /api/auth/check-username?username=...
- GET  /api/users/me
- PUT  /api/users/me
- POST /api/files/upload
- GET  /api/histories?from=&to=&riskMin=&riskMax=&status=COMPLETED&issueType=CRACK
- GET  /api/histories/{id}
- DELETE /api/histories  { "ids": [1,2,3] }
- POST /api/analysis   { "imageKeys": [...] }  // 비동기 시작(ANALYZING)

## 인증
- 로그인 응답 accessToken을 받아서 요청 헤더에 첨부
`Authorization: Bearer <token>`

## 모바일 앱 권장 플로우(요약)
- **로그인**: `/api/auth/login` → accessToken + refreshToken 저장(리프레시는 보안 저장소 권장)
- **토큰 갱신**: access 만료 시 `/api/auth/refresh`
- **업로드**: `/api/files/upload`
- **분석 시작(비동기)**: `/api/analysis` → diagnosisId/historyId/status 반환
- **상태 확인**: `/api/histories/{historyId}` 또는 목록 조회로 `ANALYZING/COMPLETED/FAILED` 확인

