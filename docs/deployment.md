# DuckTack 배포 가이드

VM 1대에 `docker compose`로 백엔드+DB를 올리고, company-web은 정적 호스팅에 붙이는 구성.
모바일 앱(Expo)은 별도 트랙이라 이 문서 맨 뒤에 따로 정리했다.

```
[사용자] → ducktack.example.com → Caddy (HTTPS 자동)
                                    ├→ /            → company-web (정적)
                                    └→ /api, /storage → backend:8080
                                                          ↓
                                                     Postgres (볼륨)
```

> **선행 조건**: 시크릿이 `application.yml` 에 하드코딩된 상태면 배포하면 안 된다.
> `backend/.env` 로 분리하는 작업이 먼저다. (JWT 시크릿이 공개 저장소에 있으면
> 누구나 관리자 토큰을 위조할 수 있음)

---

## 0. 배포 전 코드에서 고쳐야 할 것

배포 작업을 시작하기 전에 이 3개는 반드시 정리한다.

| 문제 | 위치 | 조치 |
|---|---|---|
| 업로드 파일이 재배포마다 사라짐 | `LocalFileStorage` 가 컨테이너 로컬에 저장 | docker 볼륨 마운트 (아래 5단계에 포함) |
| 이미지 URL 이 사설 IP | `STORAGE_PUBLIC_BASE_URL: http://192.168.x.x:8080` | 실제 도메인으로 (4단계) |
| 시크릿이 git 에 있음 | `application.yml` | `backend/.env` 로 분리 (3단계) |

추가 권장:
- `CORS_ALLOWED_ORIGINS` 를 `*` 대신 실제 도메인만 허용하도록
- `spring.jpa.hibernate.ddl-auto` 를 운영에선 `validate` 로 (자동 스키마 변경 방지)

---

## 1. VM 준비

### 선택지

| | 사양 | 비용 | 주의 |
|---|---|---|---|
| **오라클 클라우드 Always Free** | Ampere A1, 4 OCPU / 24GB | **영구 무료** | **ARM(aarch64)** — 아래 주의사항 |
| AWS Lightsail | 2 vCPU / 4GB | 약 $24/월 | x86, 무난 |
| 네이버클라우드 | 2 vCPU / 8GB | 약 10만원/월 | 국내 회선, 결제 편함 |

### 오라클 무료 티어를 쓸 경우 주의

ARM 아키텍처라서 **파이썬 컨테이너(`moderation-server`)의 torch 설치가 실패하거나 오래 걸릴 수 있다.**
`ai-server` 는 LLM 전환으로 이미 필요 없어졌으니, `moderation-server` 도 LLM 호출로 대체하면
파이썬 컨테이너가 완전히 사라져서 ARM 이슈가 없어진다. (권장)

또한 오라클 무료 티어는 리소스 부족으로 **인스턴스 생성이 자주 실패**한다(“Out of capacity”).
안 되면 리전을 바꾸거나 시간대를 바꿔서 재시도해야 한다. 발표 일정이 촉박하면 유료 VM 이 안전하다.

### 공통 준비

인스턴스 생성 후 SSH 접속해서:

```bash
# Docker 설치 (Ubuntu 기준)
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
# 재로그인해야 docker 명령이 sudo 없이 동작한다
exit
```

**방화벽 2곳을 모두 열어야 한다** (여기서 많이 막힌다):
1. 클라우드 콘솔의 보안 규칙 — 80, 443 인바운드 허용
2. VM 내부 방화벽

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

> 오라클은 기본 이미지에 `iptables` 규칙이 따로 걸려 있어서 `ufw` 만으로 안 열릴 수 있다.
> 안 되면 `sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT` 도 추가.

---

## 2. 도메인 + HTTPS (Caddy)

### 도메인

- 가비아/후이즈 등에서 구매 (`.com` 기준 연 1~2만원)
- 무료로 하려면 [DuckDNS](https://www.duckdns.org) 같은 서브도메인 서비스도 가능
- 구매 후 **A 레코드**를 VM 공인 IP로 지정
  ```
  ducktack.example.com    A    123.45.67.89
  ```
- DNS 전파에 몇 분~몇 시간 걸린다. `dig ducktack.example.com` 으로 확인.

### Caddy 를 쓰는 이유

nginx 는 인증서 발급(certbot)을 따로 설정해야 하는데, **Caddy 는 도메인만 적으면
Let's Encrypt 인증서를 자동 발급·자동 갱신**한다. 설정 파일도 훨씬 짧다.

프로젝트 루트에 `Caddyfile` 생성:

```caddyfile
ducktack.example.com {
    # 백엔드 API + 업로드된 이미지/PDF
    handle /api/* {
        reverse_proxy backend:8080
    }
    handle /storage/* {
        reverse_proxy backend:8080
    }

    # 나머지는 company-web 정적 파일
    handle {
        root * /srv/web
        try_files {path} /index.html   # React Router 새로고침 대응
        file_server
    }
}
```

`docker-compose.yml` 에 Caddy 서비스 추가:

```yaml
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./company-web/build:/srv/web:ro
      - caddy_data:/data      # 인증서 보관 — 없으면 재시작마다 재발급되어 한도에 걸린다
      - caddy_config:/config
    depends_on:
      - backend

volumes:
  caddy_data:
  caddy_config:
```

> `caddy_data` 볼륨을 빼먹으면 컨테이너 재시작마다 인증서를 새로 받다가
> Let's Encrypt 발급 한도(주당 5회)에 걸린다. 반드시 넣을 것.

---

## 3. `.env` 배치

`backend/.env` 는 git 에 올라가지 않으므로 **VM 에 직접 만들어야 한다.**

```bash
cd ~/DuckTack
cp backend/.env.example backend/.env
nano backend/.env
```

채워야 하는 값:

```bash
# 32자 이상. 아래로 생성:  openssl rand -base64 48
JWT_SECRET=<생성한 값>
REFRESH_PEPPER=<생성한 값>

DB_PASSWORD=<로컬과 다른 강한 비밀번호>

# 재발급받은 새 키 (기존 키는 공개 저장소에 노출된 이력이 있음)
KAKAO_REST_KEY=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
NAVER_NCP_CLIENT_ID=
NAVER_NCP_CLIENT_SECRET=

# 진단 기능에 필수. https://aistudio.google.com/apikey 에서 무료 발급
LLM_API_KEY=

# 이메일 인증코드 발송용 (비우면 발송 안 하고 서버 로그에만 출력)
SMTP_USERNAME=
SMTP_PASSWORD=
```

```bash
chmod 600 backend/.env    # 다른 사용자가 못 읽게
```

> **키 재발급은 선택이 아니라 필수다.** 기존 카카오/네이버 키는 공개 저장소 커밋 히스토리에
> 남아 있어서 이미 노출된 상태다. 각 콘솔에서 재발급 후 새 값을 넣을 것.

---

## 4. `STORAGE_PUBLIC_BASE_URL` 을 도메인으로

이걸 안 바꾸면 **배포는 되는데 앱에서 사진이 안 보인다.**

백엔드는 업로드된 파일의 URL 을 이 값 기준으로 만들어서 내려준다.
사설 IP(`192.168.x.x`)로 두면 외부 기기에서 접근이 불가능하다.

`backend/.env` 에 추가:

```bash
STORAGE_PUBLIC_BASE_URL=https://ducktack.example.com
CORS_ALLOWED_ORIGINS=https://ducktack.example.com
```

`docker-compose.yml` 의 `environment:` 블록에 같은 키가 하드코딩돼 있으면
`env_file` 값을 덮어쓰므로 **거기서는 지워야 한다.**

확인 방법: 배포 후 진단을 한 번 돌리고 응답의 `imageUrl` 이
`https://ducktack.example.com/storage/...` 형태인지 본다.

---

## 5. 빌드 & 기동

### 업로드 파일 영속화

`docker-compose.yml` 의 backend 에 볼륨이 붙어 있는지 확인 (이미 있음):

```yaml
    volumes:
      - backend_storage:/data/storage
```

이게 있어야 `docker compose down` 후에도 사용자가 올린 사진이 살아남는다.

### 백엔드 jar 빌드

`backend/Dockerfile` 은 **미리 빌드된 jar 를 복사하는 방식**이라, 이미지 빌드 전에 jar 를 만들어야 한다.

```bash
cd ~/DuckTack/backend
./gradlew clean bootJar -x test
cd ..
```

> `docker-compose.yml` 의 `build.context` 가 `./Backend`(대문자 B)로 되어 있으면
> 리눅스에서는 대소문자를 구분해서 실패한다. `./backend` 로 고칠 것.

### company-web 정적 빌드 (같은 VM 에 올릴 경우)

```bash
cd ~/DuckTack/company-web
echo "REACT_APP_API_BASE_URL=https://ducktack.example.com" > .env.production
npm ci
npm run build      # → company-web/build/ 생성, Caddy 가 이걸 서빙
cd ..
```

### 기동

```bash
docker compose up -d --build
docker compose ps          # 전부 Up 인지
docker compose logs -f backend
```

로그에서 `Started Backend1Application` 이 뜨면 성공.

### 확인

```bash
curl https://ducktack.example.com/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin1234"}'
```

> 최초 기동 시 관리자 계정(`admin` / `admin1234`)이 자동 생성된다.
> **배포 직후 반드시 비밀번호를 바꿀 것.**

---

## 6. company-web 배포 (Vercel 을 쓸 경우)

같은 VM 에 올리는 대신 Vercel/Netlify 무료 플랜을 쓰면 더 간단하고 빠르다.

1. Vercel 에서 저장소 연결
2. **Root Directory** 를 `company-web` 으로 지정
3. Build Command `npm run build`, Output Directory `build`
4. 환경변수 `REACT_APP_API_BASE_URL = https://ducktack.example.com` 등록
5. 배포 후 백엔드의 `CORS_ALLOWED_ORIGINS` 에 Vercel 도메인 추가

이 경우 Caddyfile 에서 정적 파일 부분(`handle { root ... }`)은 빼고
API 리버스 프록시만 남기면 된다.

---

## 7. 모바일 앱 (Expo) — 별도 트랙

`eas.json` 이 아직 없어서 빌드 설정부터 해야 한다.

```bash
cd frontend
npm install -g eas-cli
eas login
eas build:configure     # eas.json 생성
```

`frontend/.env` 의 API 주소를 배포 도메인으로:

```bash
EXPO_PUBLIC_API_BASE_URL=https://ducktack.example.com
```

### 데모용 APK (권장, 반나절)

```bash
eas build -p android --profile preview
```

빌드 완료되면 APK 다운로드 링크가 나온다. 파일을 공유해서 바로 설치 가능.
**졸업작품 발표용이면 이걸로 충분하다.**

### 스토어 등록 (시간 여유 있을 때)

- Google Play: 개발자 등록비 **$25 (1회)**, 심사 며칠
- App Store: Apple Developer **$99/년**, 심사가 더 까다로움

---

## 체크리스트

배포 전:
- [ ] 시크릿을 `backend/.env` 로 분리했고 git 에 안 올라감
- [ ] 카카오/네이버 키 재발급 완료
- [ ] `LLM_API_KEY` 발급 및 입력 (없으면 진단 기능 동작 안 함)
- [ ] `STORAGE_PUBLIC_BASE_URL` 이 실제 도메인
- [ ] `CORS_ALLOWED_ORIGINS` 가 `*` 아님
- [ ] `docker-compose.yml` 의 `build.context` 가 `./backend` (소문자)

배포 후:
- [ ] `admin` 계정 비밀번호 변경
- [ ] 진단 1회 실행 → `imageUrl` 이 도메인 주소인지
- [ ] 앱에서 사진 업로드/조회 정상
- [ ] `docker compose down && up` 후에도 업로드 파일이 남아있는지
- [ ] HTTPS 인증서 정상 (브라우저 자물쇠)

---

## 자주 막히는 곳

| 증상 | 원인 |
|---|---|
| 도메인 접속 안 됨 | 클라우드 콘솔 보안규칙과 VM 방화벽 **둘 다** 열어야 함 |
| 인증서 발급 실패 | DNS 전파 전이거나 80 포트가 막힘. Caddy 는 80 으로 검증함 |
| 앱에서 사진만 안 보임 | `STORAGE_PUBLIC_BASE_URL` 이 사설 IP |
| 재배포 후 사진 사라짐 | `backend_storage` 볼륨 미연결 |
| company-web 에서 API 호출 시 CORS 에러 | `CORS_ALLOWED_ORIGINS` 에 웹 도메인 누락 |
| 진단 시 "LLM API 키가 설정되지 않았습니다" | `LLM_API_KEY` 미입력 |
| ARM VM 에서 컨테이너 빌드 실패 | 파이썬(torch) 컨테이너. LLM 대체 검토 |
