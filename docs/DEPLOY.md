# 배포 가이드 — Vercel(클라) + Fly.io(서버)

학기 내내 학생들에게 URL 1개 주고 운영하는 정식 배포. 두 서비스 모두 무료 tier로 충분.

---

## 사전 준비 (15분, 1회만)

```bash
# Fly CLI
brew install flyctl
fly auth signup     # 또는 fly auth login

# Vercel CLI
npm i -g vercel
vercel login
```

git 저장소가 없다면:
```bash
cd /Users/sim-insu/Documents/dev/rpggame/runeword-chronicle
git init && git add -A && git commit -m "initial"
# GitHub에 push (Vercel 연동에 권장 — 자동 재배포)
gh repo create runeword-chronicle --public --source=. --push
```

---

## STEP 1 — 서버를 Fly.io에 배포 (10분)

```bash
cd /Users/sim-insu/Documents/dev/rpggame/runeword-chronicle

# 1) 앱 생성 (이름 충돌 시 fly.toml의 app 이름 변경)
fly apps create runeword-chronicle-server

# 2) 시크릿 설정 — 일단 CORS는 와일드카드로 둠 (Vercel 도메인 받으면 잠금)
fly secrets set \
  ALLOWED_ORIGINS='*' \
  MONITOR_USER='teacher' \
  MONITOR_PASS="$(openssl rand -hex 12)" \
  JWT_SECRET="$(openssl rand -hex 32)" \
  --app runeword-chronicle-server

# 3) 배포 (모노레포 루트에서, Dockerfile/fly.toml 명시)
fly deploy \
  --config apps/server/fly.toml \
  --dockerfile apps/server/Dockerfile \
  --app runeword-chronicle-server

# 4) 확인
fly status --app runeword-chronicle-server
curl https://runeword-chronicle-server.fly.dev/health
# → {"status":"ok","starting_map":"aurora_town","map_count":17,...}
```

✅ **얻는 것**: `wss://runeword-chronicle-server.fly.dev` 게임 서버 URL.

> **idle stop**: 무료 tier에서 15분 무접속 시 머신이 정지됨. 학생 첫 접속 시 ~5초 부팅. 수업 직전 `curl https://runeword-chronicle-server.fly.dev/health`로 미리 깨워두면 매끄러움.
>
> **상시 가동**: 수업 시간만 보장하려면 `fly scale count 1 --max-per-region 1 --app runeword-chronicle-server` (요금 발생 가능, 무료 tier 시간 한도 내).

---

## STEP 2 — 클라이언트를 Vercel에 배포 (5분)

### 옵션 A) GitHub 연동 (권장 — push 시 자동 재배포)

1. https://vercel.com/new 접속
2. GitHub 저장소 import → `runeword-chronicle`
3. **Framework Preset**: `Other` (vercel.json이 자동 인식)
4. **Root Directory**: `.` (루트 그대로)
5. **Environment Variables** 추가:
   - `VITE_SERVER_WS` = `wss://runeword-chronicle-server.fly.dev`
6. Deploy 클릭

### 옵션 B) CLI 직접 배포

```bash
cd /Users/sim-insu/Documents/dev/rpggame/runeword-chronicle

# 환경변수 등록 (production)
echo "wss://runeword-chronicle-server.fly.dev" | vercel env add VITE_SERVER_WS production

# 첫 배포 (preview)
vercel
# → 프롬프트: project 이름, 팀 등 입력

# production 배포
vercel --prod
# → https://runeword-chronicle-xxxx.vercel.app
```

✅ **얻는 것**: `https://your-app.vercel.app` 학생 접속 URL.

---

## STEP 3 — CORS 잠그기 (1분)

Vercel 도메인이 확정되면 Fly 서버 CORS를 그 도메인으로 한정:

```bash
fly secrets set \
  ALLOWED_ORIGINS='https://runeword-chronicle-xxxx.vercel.app' \
  --app runeword-chronicle-server
# 자동 재시작
```

---

## STEP 4 — 동작 확인

1. 학생 접속 URL: `https://runeword-chronicle-xxxx.vercel.app`
2. 학급 코드 `TEST1234` + 닉네임으로 입장
3. 마을 진입 후 BGM 재생, 이동, 사냥, 단어 퀴즈 모두 동작
4. 교사 모니터: `https://runeword-chronicle-server.fly.dev/colyseus`
   - 로그인: `MONITOR_USER` / `MONITOR_PASS`
   - 활성 룸·접속자 수 실시간 확인

---

## 운영 명령어 치트시트

```bash
# 서버
fly logs --app runeword-chronicle-server               # 실시간 로그
fly ssh console --app runeword-chronicle-server        # 컨테이너 진입
fly status --app runeword-chronicle-server             # 머신 상태
fly scale count 1 --app runeword-chronicle-server      # 1대 상시 가동
fly secrets list --app runeword-chronicle-server       # 등록된 시크릿
fly deploy --config apps/server/fly.toml --dockerfile apps/server/Dockerfile --app runeword-chronicle-server  # 재배포

# 클라
vercel --prod                                          # 재배포
vercel logs                                            # 최근 빌드 로그
vercel env ls                                          # 환경변수 목록
vercel domains add classroom.your-school.kr            # 커스텀 도메인 (선택)
```

---

## 비용·한도 요약

| 항목 | 무료 tier | 학급 20명 시연 적합도 |
|------|----------|---------------------|
| Vercel Hobby | 100GB BW/월, 무제한 빌드 | 충분 (학급 수년 운영 가능) |
| Fly.io 무료 | 3 shared-cpu 머신 (256MB), 160GB outbound/월 | 충분 (학급 1개) |
| Fly idle stop | 15분 무접속 시 정지 | 첫 접속자에 5초 지연 |

학년 전체(여러 학급) 운영 시: Fly 머신 메모리 1GB로 올리거나 학급당 별도 앱.

---

## 트러블슈팅

| 증상 | 원인 / 해결 |
|------|-----------|
| 클라가 `WebSocket connection failed` | `VITE_SERVER_WS`가 `wss://` 인지 확인. http면 mixed-content 차단 |
| Fly 빌드 `pnpm: not found` | `corepack enable` 라인 누락 — Dockerfile 그대로 사용 |
| Fly 빌드 `Cannot find module 'shared'` | `pnpm --filter shared build`가 빌드 단계에서 실행됐는지 확인 |
| Vercel 빌드 `Cannot find module 'phaser'` | Root Directory를 `.`로, `installCommand`가 루트에서 `pnpm install` 하는지 확인 |
| 서버 헬스체크 fail | `/health`가 200 응답하는지: `curl https://<app>.fly.dev/health` |
| 첫 접속이 느림 | idle stop. `fly scale count 1`로 상시 가동 또는 수업 전 미리 헬스체크 |
| Colyseus 모니터 401 | `MONITOR_USER` / `MONITOR_PASS` 시크릿 확인 |

---

**한 줄 요약**: `fly deploy` → `vercel --prod` → 환경변수 `VITE_SERVER_WS` 등록 → 끝. 학생들에게 Vercel URL만 공유.
