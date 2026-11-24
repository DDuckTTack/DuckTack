# DuckTack 배포 가이드

VM 1대에 `docker compose` 로 **Caddy + Spring Boot + Postgres** 를 올리고,
업체·관리자 웹(`company-web`)은 같은 VM 의 Caddy 가 정적 서빙한다.
모바일 앱(Expo)은 서버 배포 대상이 아니라 APK 빌드라 맨 뒤에 따로 정리했다.

```
[사용자] → <도메인> → Caddy (HTTPS 자동 발급)
                        ├─ /           → company-web (정적)
                        ├─ /api/*      → backend:8080
                        ├─ /storage/*  → backend:8080   (업로드 사진/PDF)
                        └─ /ws*        → backend:8080   (STOMP 실시간 채팅)
                                            ↓
                                       Postgres (docker 볼륨)
```

> **현재 운영 주소**: `https://dduckttack.duckdns.org`
> VM 공인 IP 는 Lightsail 콘솔에서 확인한다 (`dig +short dduckttack.duckdns.org` 로도 나온다).
> 이 저장소는 공개 저장소이므로 IP·키·비밀번호를 문서에 적지 말 것.

---

## 이 문서의 전제

- **욕설 필터(`moderation-server`) 를 제외한** 구성이다. torch 설치에 RAM 1.5GB 이상이 필요해서
  2GB VM 에서는 백엔드가 OOM 으로 죽는다. 필터를 쓰려면 4GB 이상으로 올려야 한다.
- 백엔드 jar 과 업체웹 빌드는 **맥에서 만들어 VM 으로 전송**한다.
  `build/` 와 `node_modules/` 가 git 추적 대상이 아니라서 VM 에서 clone 만으로는 생기지 않고,
  VM 에 JDK·Node 를 설치하면 2GB 메모리를 더 압박하기 때문이다.

---

## 1. VM 생성 (AWS Lightsail)

- 리전 **Seoul (ap-northeast-2)**
- **Linux operating system → Ubuntu 22.04 LTS**
  (`Linux apps` 블루프린트는 WordPress 등이 미리 깔려 나오므로 고르지 말 것)
- 네트워크 타입 **Dual-stack**
  (`IPv6-only` 를 고르면 공인 IPv4 가 없어 DNS A 레코드부터 전부 깨진다)
- 플랜 **$12 / 2GB RAM / 2 vCPU / 60GB SSD**
- SSH 키는 `Advanced settings` 에서 생성·다운로드한다. 건너뛰면 리전 기본 키가 쓰이고,
  콘솔 우측 상단 **Account → SSH keys** 에서 받을 수 있다.

생성 후 **Networking 탭**에서 두 가지를 반드시 한다.

1. **Attach static IP** — 고정 IP 할당. 없으면 재부팅 때 IP 가 바뀌어 도메인이 끊긴다.
2. **IPv4 Firewall** — 기본값은 HTTP(80)/SSH(22) 뿐이다. **HTTPS(443) 를 직접 추가**한다.
   Preset 은 `Any IP address` 로 (Custom 으로 두면 소스 IP 를 요구한다).

> 443 을 빼먹으면 인증서는 발급되는데(검증은 80 으로 한다) 브라우저·앱에서 접속이 안 된다.

### 오라클 클라우드 무료 티어를 검토했다면

ARM(aarch64) 이라 파이썬 컨테이너 빌드가 깨지고, 무료 ARM 인스턴스는 "Out of capacity" 로
생성이 반복 실패한다. 발표 일정이 걸려 있으면 유료 VM 이 안전하다.

---

## 2. 도메인 (DuckTack 은 DuckDNS 사용)

HTTPS 인증서는 도메인이 있어야 발급된다. IP 만으로는 불가능하고,
Expo 앱은 평문 HTTP 를 막기 때문에 **도메인은 선택이 아니라 필수**다.

1. https://www.duckdns.org 구글 로그인
2. 서브도메인 입력 → **add domain**
3. `current ip` 에 Lightsail **고정 IP** 입력 → **update ip**

확인:

```bash
dig +short <도메인>
```

고정 IP 가 나오면 된다. 유료 도메인을 쓰면 A 레코드에 IP 를 넣으면 되고 전파에 더 걸린다.

---

## 3. VM 기본 세팅

```bash
ssh -i <키>.pem ubuntu@<VM_IP>
```

### Docker 설치 — 공식 저장소를 써야 한다

`docker-compose-plugin` 은 **Ubuntu 기본 저장소에 없다.**
`sudo apt install docker.io docker-compose-plugin` 은 패키지를 못 찾아 **명령 전체가 실패**한다.

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin git
```

```bash
sudo usermod -aG docker $USER && sudo systemctl enable --now docker && exit
```

**반드시 재접속**해야 `docker` 가 sudo 없이 동작한다.

### 스왑 2GB — 2GB 플랜에서는 필수

없으면 이미지 빌드 중 OOM 으로 죽는다.

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
docker --version && docker compose version && free -h
```

---

## 4. 코드와 빌드 산출물

### VM: 저장소 clone

```bash
git clone -b develop https://github.com/DDuckTTack/DuckTack.git ~/DuckTack
mkdir -p ~/DuckTack/backend/build/libs
```

### VM: 욕설 필터 제거

`docker-compose.yml` 에서 두 군데를 지운다.

- `moderation-server:` 서비스 블록 **전체**
- `backend` 의 `depends_on:` 안에 있는 `moderation-server:` 와 그 아래 `condition:` **2줄**

현재 파일 기준으로는 아래 한 줄로 처리된다.

```bash
cd ~/DuckTack && sed -i '54,63d;47,48d' docker-compose.yml && grep -n "moderation" docker-compose.yml
```

출력이 **`MODERATION_BASE_URL` 한 줄만** 남으면 정상이다
(필터를 끄면 호출하지 않으므로 이 줄은 둬도 무해하다).
`moderation-server:` 가 아직 보이면 줄 번호가 밀린 것이므로
`git checkout docker-compose.yml` 로 되돌리고 편집기로 직접 지운다.

### 맥: 백엔드 jar 빌드

`backend/Dockerfile` 은 미리 만들어진 jar 을 복사하는 방식이다.

```bash
git checkout develop && git pull origin develop
cd backend && ./gradlew clean bootJar -x test
```

### 맥: 업체웹 빌드

```bash
cd company-web
echo "REACT_APP_API_BASE_URL=https://<도메인>" > .env.production
npm ci && npm run build
```

> `.env.production` 을 빼먹으면 **웹은 뜨는데 로그인이 안 된다.**
> `company-web/.env` 가 `http://localhost:8080` 이라 그 값이 빌드에 박힌다.

### 맥: VM 으로 전송

```bash
scp -i <키>.pem backend/build/libs/*.jar ubuntu@<VM_IP>:~/DuckTack/backend/build/libs/
scp -i <키>.pem -r company-web/build ubuntu@<VM_IP>:~/DuckTack/company-web/
```

> **재전송 시 주의**: VM 에 `company-web/build` 가 이미 있으면 scp 가 그 **안으로** 복사해서
> `build/build` 로 중첩된다. 보내기 전에 VM 에서 `rm -rf ~/DuckTack/company-web/build` 를 먼저 한다.

확인:

```bash
ls -lh ~/DuckTack/backend/build/libs/ && ls ~/DuckTack/company-web/build | head -3
```

---

## 5. `backend/.env`

`.env` 는 git 에 올라가지 않으므로 VM 에서 직접 만든다.

```bash
cd ~/DuckTack
cp backend/.env.example backend/.env
ln -s backend/.env .env
chmod 600 backend/.env
```

> **`ln -s` 가 핵심이다.** compose 의 `${VAR}` 치환은 **프로젝트 루트의 `.env` 만** 읽는다.
> 빠뜨리면 `DB_PASSWORD 를 설정하세요` 에러로 아예 기동되지 않는다.

시크릿 2개를 한 번에 생성한다 (각각 달라야 한다).

```bash
printf 'JWT_SECRET=%s\nREFRESH_PEPPER=%s\n' "$(openssl rand -base64 48 | tr -d '\n')" "$(openssl rand -base64 48 | tr -d '\n')"
```

`nano backend/.env` 로 채운다.

| 키 | 설명 |
|---|---|
| `JWT_SECRET`, `REFRESH_PEPPER` | 위에서 생성. **기본값 없음 — 비우면 기동 실패** |
| `DB_PASSWORD` | 로컬과 다른 강한 값 |
| `STORAGE_PUBLIC_BASE_URL` | `https://<도메인>` — 안 바꾸면 **앱에서 사진이 안 보인다** |
| `CORS_ALLOWED_ORIGINS` | `https://<도메인>`. `*` 금지 |
| `KAKAO_REST_KEY` | 업체 키워드 검색. 비우면 기동 실패 |
| `NAVER_NCP_CLIENT_ID` / `_SECRET` | 주소→위경도. 비우면 기동 실패 |
| `LLM_API_KEY` | AI 진단. 없으면 핵심 기능이 동작하지 않음 |
| `MODERATION_ENABLED` | **`false`** (필터 컨테이너를 뺐으므로) |

### 메일(SMTP) — 함정 주의

`EmailVerificationService` 는 **`SMTP_HOST` 가 비어 있을 때만** 발송을 건너뛰고
인증코드를 로그에 찍는다. `.env.example` 에는 `SMTP_HOST` 가 채워져 있으므로,
**비밀번호만 비우면 발송을 시도하다 실패해서 회원가입 이메일 인증이 에러로 떨어진다.**

- **메일을 쓸 경우**: Brevo → **SMTP & API → SMTP 탭**에서 `Generate a new SMTP key`
  (생성 직후 한 번만 표시된다). 같은 화면의 **Login** 값이 `SMTP_USERNAME` 이다.
  그리고 **Senders** 에서 `MAIL_FROM` 주소를 **Verified** 상태로 만들어야 발송된다.
  지메일 등 무료 주소는 수신측 스팸함으로 갈 수 있다.
- **메일을 안 쓸 경우**: `SMTP_HOST=` 로 **비운다.** 인증코드는 서버 로그에서 확인한다.

  ```bash
  docker compose logs backend | grep "Dev code"
  ```

검증:

```bash
cd ~/DuckTack && docker compose config --quiet && echo "정상"
```

---

## 6. Caddyfile 도메인 반영

```bash
cd ~/DuckTack && sed -i 's/ducktack.example.com/<도메인>/' Caddyfile && grep -n "duckdns\|example.com" Caddyfile
```

도메인은 **Caddyfile 과 `backend/.env` 두 군데 모두** 들어간다. 역할이 다르다.

| 위치 | 역할 | 빠뜨리면 |
|---|---|---|
| `Caddyfile` | 수신 도메인 + 인증서 발급 대상 | 사이트 접속 자체가 안 됨 |
| `backend/.env` | 이미지 URL 생성, CORS 허용 출처 | 서버는 뜨는데 앱에서 사진이 안 보임 |

---

## 7. 기동

```bash
cd ~/DuckTack && docker compose up -d --build
docker compose ps
```

`db` 가 healthy, `backend` 와 `caddy` 가 Up 이어야 한다.

```bash
docker compose logs backend | grep -E "Started Backend1Application|APPLICATION FAILED" | tail -3
docker compose logs caddy | grep -i "certificate obtained"
```

`Started Backend1Application` 과 `certificate obtained` 가 모두 나오면 성공이다.
인증서가 안 나오면 DNS 가 아직 안 퍼졌거나 80 포트가 막힌 것이다 (Caddy 는 80 으로 검증한다).

> 기동 중 `constraint ... does not exist, skipping` 경고가 다량 나오는 것은 정상이다.
> `ddl-auto=update` 가 빈 DB 에서 없는 제약조건을 정리하려다 남기는 메시지다.

---

## 8. 검증

```bash
curl -I https://<도메인>                      # HTTP/2 200
curl -s -o /dev/null -w "%{http_code}\n" https://<도메인>/api/community/posts   # 200
```

- 브라우저에서 업체웹이 뜨고 자물쇠가 보이는지
- 진단 1회 실행 → 응답 `imageUrl` 이 `https://<도메인>/storage/...` 인지 (사설 IP 면 5번 누락)
- 사진 업로드/조회, 채팅(WebSocket), 회원가입 메일 수신
- `docker compose down && docker compose up -d` 후에도 업로드 파일과 계정이 남아 있는지

---

## 9. 배포 직후 할 일

### admin 비밀번호 변경 — 반드시

최초 기동 시 `admin` / `admin1234` 계정이 자동 생성된다(`AdminBootstrapRunner`).
**로그인 상태에서 비밀번호를 바꾸는 기능이 앱·웹 어디에도 없고**, 부트스트랩 이메일이
`admin@dduckttack.com` 이라 재설정 코드도 받을 수 없다. 아래 둘 중 하나로 처리한다.

**A. admin 이메일을 수신 가능한 주소로 바꾸고 재설정 API 사용 (권장)**

```bash
docker compose exec db psql -U appuser -d appdb -c "UPDATE users SET email='<본인메일>' WHERE username='admin';"
```

```bash
curl -X POST https://<도메인>/api/auth/password/send-reset-code \
  -H "Content-Type: application/json" -d '{"email":"<본인메일>"}'
```

메일로 온 6자리 코드로 (스팸함도 확인):

```bash
curl -X POST https://<도메인>/api/auth/password/reset -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"<본인메일>","code":"<코드>","newPassword":"<8자이상>"}'
```

메일 파이프라인까지 같이 검증된다는 장점이 있다.

**B. 해시를 직접 교체**

```bash
docker run --rm httpd:alpine htpasswd -nbBC 10 x '<새비밀번호>' | cut -d: -f2
docker compose exec db psql -U appuser -d appdb -c "UPDATE users SET password_hash='<해시>' WHERE username='admin';"
```

변경 확인 — `401` 이 나와야 한다.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<도메인>/api/auth/login \
  -H "Content-Type: application/json" -d '{"username":"admin","password":"admin1234"}'
```

### 스키마 고정

테이블이 만들어졌으므로 `.env` 의 `JPA_DDL_AUTO` 를 **`validate`** 로 바꾸고 재기동한다
(운영 중 의도치 않은 스키마 변경 방지).

```bash
docker compose restart backend
docker compose logs backend | grep -E "Started Backend1Application|Schema-validation" | tail -3
```

`Schema-validation` 에러가 나면 엔티티와 테이블이 불일치하는 것이다. `update` 로 되돌리면 원복된다.

### 기타

- `SQL_LOG_LEVEL=info` 확인 (디버그 로그로 디스크가 차는 것 방지)
- 카카오·네이버 키 재발급 — 기존 키는 커밋 히스토리에 노출된 이력이 있다

---

## 10. 재배포 (코드 수정 후)

**백엔드만 바뀐 경우** — 맥에서:

```bash
cd backend && ./gradlew clean bootJar -x test
scp -i <키>.pem build/libs/*.jar ubuntu@<VM_IP>:~/DuckTack/backend/build/libs/
```

VM 에서:

```bash
cd ~/DuckTack && docker compose up -d --build backend
```

**업체웹만 바뀐 경우** — VM 에서 기존 빌드를 지우고, 맥에서 다시 빌드·전송한다.
Caddy 는 볼륨 마운트로 읽으므로 **재기동이 필요 없다.**

```bash
# VM
rm -rf ~/DuckTack/company-web/build
# 맥
cd company-web && npm run build
scp -i <키>.pem -r build ubuntu@<VM_IP>:~/DuckTack/company-web/
```

**설정(`.env`)만 바뀐 경우** — VM 에서:

```bash
cd ~/DuckTack && docker compose up -d --force-recreate backend
```

> `docker compose restart` 는 컨테이너를 만들 때 읽은 환경변수를 그대로 쓴다.
> `.env` 를 고친 뒤 `restart` 만 하면 **새 값이 적용되지 않으니** 반드시 컨테이너를 다시 만든다.

---

## 11. 모바일 앱 (Expo / EAS)

서버에 올리는 것이 아니라 APK 를 만들어 배포한다.

```bash
cd frontend
npm install                    # develop 을 pull 했으면 반드시. 새 네이티브 모듈이 추가돼 있다
npx eas-cli build:configure    # Expo 로그인 필요, eas.json 생성
npx eas-cli build -p android --profile preview
```

### 반드시 확인할 설정

- **`eas.json` 의 `env`** — `frontend/.env` 는 gitignore 대상이라 **EAS 클라우드 빌드에 업로드되지 않는다.**
  프로필마다 `env.EXPO_PUBLIC_API_BASE_URL` 을 명시해야 한다. 안 하면 API 주소가 `undefined` 인
  APK 가 만들어져 모든 호출이 실패한다.
- **`preview` 프로필의 `android.buildType: "apk"`** — 기본 `production` 프로필은 Play Store 용
  **AAB** 를 만들어 폰에 직접 설치되지 않는다.
- **`app.json` 의 `expo.android.package`** — 미리 지정해두면 빌드 중 입력 프롬프트가 뜨지 않는다.
  스토어 등록 후에는 변경할 수 없다.

### 배포 방법

`distribution: internal` 이라 빌드 완료 시 **설치 페이지 링크와 QR** 이 나온다.
QR 을 발표 슬라이드에 띄우면 안드로이드 사용자가 바로 설치할 수 있다.
설치 시 "알 수 없는 출처 허용" 을 한 번 눌러야 한다.

APK 를 우리 서버에서 직접 받게 하려면 (Expo 페이지를 거치지 않아 현장에서 빠르다):

```bash
scp -i <키>.pem <APK파일> ubuntu@<VM_IP>:~/DuckTack/company-web/build/dduckttack.apk
# → https://<도메인>/dduckttack.apk
```

업체웹을 재배포하면 `build` 폴더가 교체되면서 APK 도 지워지므로 다시 올려야 한다.

### iOS

APK 는 아이폰에 설치할 수 없다. TestFlight 는 Apple Developer($99/년) 등록과 심사가 필요해
단기간에는 어렵다. **Expo Go 를 쓰면 무료로 즉시 가능하다** — 현재 의존성이 전부
Expo SDK 내장 모듈이라 커스텀 네이티브 빌드 없이 동작한다.

```bash
cd frontend && npx expo start --tunnel
```

관객이 App Store 에서 **Expo Go** 를 설치한 뒤 QR 을 찍으면 실행된다.
발표 중 맥에서 개발 서버가 계속 떠 있어야 하고, 주소는 실행할 때마다 바뀐다.

> **`frontend/.env.local` 주의**: `.env` 보다 우선 적용된다. 로컬 개발용으로
> `http://localhost:8080` 이 들어 있으면 폰에서는 아무것도 동작하지 않는다.
> 시연 전에 `mv .env.local .env.local.bak` 으로 비켜둔다. (EAS 클라우드 빌드에는 영향 없다.)

---

## 자주 막히는 곳

| 증상 | 원인 |
|---|---|
| `apt install` 에서 `docker-compose-plugin` 을 못 찾음 | Ubuntu 저장소에 없다. Docker 공식 저장소를 추가해야 한다 (3번) |
| `docker` 명령이 없다고 나옴 | 위 설치가 통째로 실패했거나, `usermod` 후 재접속을 안 했다 |
| `DB_PASSWORD 를 설정하세요` | 루트 `.env` 심볼릭 링크 누락 (5번) |
| 도메인 접속 안 됨 | Lightsail 방화벽에 **443** 이 없다. 80 만으로는 인증서만 발급된다 |
| 인증서 발급 실패 | DNS 미전파 또는 80 포트 차단 |
| 웹은 뜨는데 로그인이 안 됨 | `company-web/.env.production` 없이 빌드해서 `localhost:8080` 이 박혔다 |
| 앱에서 사진만 안 보임 | `STORAGE_PUBLIC_BASE_URL` 이 사설 IP 또는 예시 도메인 |
| 재배포 후 사진이 사라짐 | `backend_storage` 볼륨 미연결 |
| CORS 에러 | `CORS_ALLOWED_ORIGINS` 에 웹 도메인 누락 |
| 회원가입에서 메일 발송 에러 | `SMTP_HOST` 는 채워져 있는데 `SMTP_PASSWORD` 가 비었다 (5번) |
| 진단 시 "LLM API 키가 설정되지 않았습니다" | `LLM_API_KEY` 미입력 |
| 업체웹 재전송 후 404 | `build/build` 로 중첩됐다. VM 에서 지우고 다시 보낸다 |
| APK 에서 모든 API 호출 실패 | `eas.json` 에 `EXPO_PUBLIC_API_BASE_URL` 미설정 |
| 빌드 산출물이 `.aab` 로 나옴 | `production` 프로필로 빌드했다. `--profile preview` 를 쓴다 |
