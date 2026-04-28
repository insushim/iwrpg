# 🗡️ Runeword Chronicle: Call of the Aether

> **단어를 맞춰야 칼이 든다 — 학급 20명이 함께 누비는 다크 판타지 어휘 RPG**

리니지 클래식 게임성 + 영어 어휘 퀴즈 + 학급 20명 동시 접속 MMORPG. 몬스터를 공격하면 영어 단어 4지선다 퀴즈가 출제되고, **정답일 때만** 데미지·EXP·골드·아이템을 획득합니다. 가챠 박스는 영문해석 도전(C1/C2)으로 일일 토큰을 모아 열 수 있습니다.

## 🎯 게임 컨셉

- **장르**: 2D 탑다운 그리드 액션 MMORPG + 영어 학습
- **플랫폼**: Web (PC 우선) + 태블릿
- **동시 접속**: 학급 20명 안정 운영 (최대 50명)
- **타겟 연령**: 초등 5~6학년 (확장: 3~6학년 + 예비중1)
- **세션 길이**: 수업 15~40분 / 자율 학습 1~2시간

## 🔑 핵심 메카닉 10가지

1. **단어 게이트 전투** — 모든 데미지는 단어 퀴즈 정답 시에만 적용
2. **No-Repeat Cycle Queue** — 정답 단어는 한 사이클 완주 전엔 재출제 X
3. **양방향 출제** — 50% 확률로 영→한, 50%로 한→영
4. **HP바 비표시** — 몬스터/플레이어 위에 HP바 없음, 좌상단 패널만 표시
5. **인챈트 +1~+9** — 리니지식 강화 (+6부터 파괴 가능, 축복받은 주문서로 안전화)
6. **변신 시스템** — 12종 변신석
7. **유니크 → 레전더리 제작** — 12개 유니크, 6개 레전더리 (2가지 레시피 경로)
8. **카오스/순결 시스템** — alignment -100 ~ +100
9. **학급 길드** — 교사 1명 GM + 학생 19명 길드원
10. **🎁 영문해석 가챠** *(NEW)* — C1/C2 도전 → 일일 최대 3토큰 → 5종 가챠 박스

## 🏗️ 기술 스택

| 영역 | 도구 | 버전 |
|------|------|------|
| Frontend (게임) | Phaser 3 + TypeScript + Vite | 3.85+ |
| Backend (실시간) | Colyseus 0.16 + @colyseus/schema 3.0 + Node 22 | 0.16+ |
| DB / Auth | Supabase (PostgreSQL + Realtime + Auth) | 로컬 도커 권장 |
| Audio | Tone.js (BGM 합성) + Howler (SFX) | 14+ / 2.2+ |
| Asset Gen | codex CLI (gpt-image-2) | ChatGPT Plus/Pro 한도 내 무료 |
| Visual QA | Puppeteer + Claude Code Read 직접 분석 | 24+ |

## 📁 프로젝트 구조

```
runeword-chronicle/
├── apps/
│   ├── client/              # Phaser 게임 클라이언트 (Vite)
│   │   └── src/
│   │       ├── main.ts                    # Phaser.Game 부트
│   │       ├── network/ColyseusClient.ts  # 실시간 통신
│   │       ├── scenes/                    # Boot/Login/CharCreate/World/HUD
│   │       ├── systems/                   # Quiz, WordQueue, AudioManager
│   │       ├── ui/                        # QuizModal, GachaModal, Inventory, ...
│   │       └── data/                      # words(2,200) + monsters(38) + items(245) + maps(17) + npcs(78) + gacha(5박스 50도전)
│   └── server/              # Colyseus 멀티플레이어 서버
│       └── src/
│           ├── index.ts                   # Express + Colyseus boot
│           ├── rooms/                     # WorldRoom + Schemas
│           ├── game/                      # Combat, MonsterSpawner, Drop, Quiz, Gacha, Enchant
│           └── persistence/               # Supabase repositories
├── packages/
│   └── shared/              # 공유 타입·메시지·밸런스
├── tools/                   # 자동화 스크립트 (codex 에셋, 슬라이서, QA)
├── supabase/migrations/     # 001_create_tables.sql + 002_rls_policies.sql
└── docs/                    # GDD/PLAN/ASSET-LIST
```

## 🚀 로컬 실행

### 1. 사전 요구사항
```bash
node -v   # 22+
pnpm -v   # 10+
codex --version   # 0.123+ (ChatGPT Plus/Pro 로그인 필요)
supabase --version   # 2.90+
docker -v   # Supabase 로컬 실행 시 필요
```

### 2. 설치
```bash
git clone <repo>
cd runeword-chronicle
pnpm install
cp .env.example .env  # 기본값 그대로 OK (로컬 Supabase 키 매핑됨)
```

### 3. 실행 (개발 모드)
```bash
# 1) Supabase 로컬 시작 (Docker 필요)
supabase start

# 2) 마이그레이션 적용
supabase db push

# 3) 서버 + 클라이언트 동시 실행
pnpm dev
# → 서버: ws://localhost:2567
# → 클라: http://localhost:5173
```

### 4. 에셋 생성 (선택)
```bash
# 우선순위 1 에셋 ~85컷 (Pro 5h 한도 내 1사이클)
pnpm assets:priority1
```

### 5. Visual QA (Puppeteer + 직접 분석)
```bash
# 클라+서버 켜진 상태에서:
node tools/capture-screenshots.js
# → /tmp/rwc-qa/01_login.png ~ 07_movement.png
```

## 🎮 플레이 방법

1. **로그인** — 학급 초대 코드(`TEST1234`) + 닉네임 + 학년 선택
2. **직업 선택** — 천공왕(Aether-Lord) / 강철의 파수꾼(Iron-Sentinel) / 숲의 투사(Sylvan Ranger) / 룬 직조사(Rune-Weaver)
3. **마을 입장** — 여명의 마을(Aurora Town)에서 시작
4. **사냥** — 사냥터로 이동 → 몬스터 클릭 → **단어 퀴즈 4지선다 (학년별 5~10초)** → 정답 시 데미지 적용
5. **레벨업** — 정답으로 EXP 누적 → 자동 스탯 성장
6. **인챈트** — 강화 주문서로 +1~+9 무기/방어구 강화
7. **가챠** — `G` 키 → C1/C2 영문해석 도전 → 일일 최대 3토큰 → 5종 가챠 박스 오픈

### 키보드
| 키 | 액션 |
|----|------|
| W A S D / 화살표 | 이동 (단, 채팅창에서는 일반 입력) |
| 마우스 클릭 | 이동 / 적 공격 |
| 1~4 | 퀴즈 답 선택 |
| I | 인벤토리 |
| C | 캐릭터 |
| G | 가챠 |
| M | **세계 지도 (17맵 + 4보스던전)** |
| W | **단어장 (학습 통계)** |
| B | 음소거 토글 |
| ESC | 모달 닫기 |
| Enter (채팅창) | 메시지 전송 |

> 채팅 입력란에 포커스가 있으면 `WASD/I/G/M/W/B` 단축키는 무시되고 글자가 그대로 입력됩니다. 한글 IME도 정상 동작.

## 📊 콘텐츠 통계

| 항목 | 수량 |
|------|------|
| 영어 단어 | 1,400+ (목표 2,200, 추후 확장) |
| 몬스터 | 38종 (28일반 + 6네임드 + 4월드보스) |
| 아이템 | 245개 (12 유니크 + 6 레전더리 포함) |
| 맵 | 17개 (5마을 + 12사냥터) + 4 보스던전 |
| NPC | 78명 |
| 제작 레시피 | 12개 (레전더리 6종 × 2 경로) |
| 가챠 박스 | 5종 (Normal/Rare/Epic/Legendary/Rune) |
| 영문해석 도전 | 50문제 (30 C1 / 15 C2 / 5 C2 advanced) |
| 직업 | 4종 (균형형/탱커/원거리/마법) |

## 🎨 에셋 생성 (codex CLI)

이 게임은 **외부 유료 API 키 0개**로 동작합니다:

- **이미지**: codex CLI gpt-image-2 (ChatGPT Plus/Pro 한도 내 무료)
- **사운드**: Tone.js 절차 합성 BGM 4트랙(town/hunt/dungeon/boss) + Web Audio SFX 13종 — **음원 파일 0개**
- **발음 TTS**: Web Speech API
- **폰트**: Google Fonts (Cinzel + Noto Serif KR + Inter + Noto Sans KR)

```bash
# 캐릭터 컨셉 1컷
bash tools/codex-asset.sh single \
  --prompt "Aether-Lord character concept, dark fantasy 2D MMORPG..." \
  --resolution 1024x1024 \
  --output "$(pwd)/apps/client/public/assets/img/characters/aether_lord_concept.png"

# 4×3 스프라이트시트 → sharp로 슬라이스
bash tools/codex-asset.sh sheet \
  --prompt "Aether-Lord spritesheet, 4 cols × 3 rows..." \
  --reference "apps/client/public/assets/img/characters/aether_lord_concept.png" \
  --resolution 1024x1024 \
  --output "$(pwd)/apps/client/public/assets/img/characters/aether_lord_sheet_raw.png"
node tools/slice-spritesheet.js \
  --input apps/client/public/assets/img/characters/aether_lord_sheet_raw.png \
  --output apps/client/public/assets/img/characters/aether_lord/ \
  --cols 4 --rows 3 \
  --naming "{anim}_{frame}" \
  --row-names "idle,walk,attack"
```

## 🛡️ 저작권 / 법적

이 게임의 모든 명칭(`Aether-Lord`, `Aurora Town`, `Whisper Woods`, `Vyranthos` 등)과 디자인 토큰은 오리지널이며, 리니지/엔씨소프트와 무관합니다. 게임 메카닉(인챈트, 4직업 트라이앵글)은 저작권 보호 대상이 아닙니다.

상업화 시 추가 절차:
- 한국 교육공무원법: 겸직허가 (사용자 본인 상황)
- 게임물관리위원회: 자체등급분류 사업자 등록 또는 무료 학습용 면제
- 청소년보호법: 학급 모드 기본 ON
- 개인정보보호법: 만 14세 미만 법정대리인 동의 (학급 초대코드로 우회 가능)

## ☁️ 정식 배포 (Vercel + Fly.io)

학기 내내 학생들에게 URL 1개 주고 운영하려면:

```bash
# 서버 (Fly.io) — 10분
fly auth login
fly apps create runeword-chronicle-server
fly secrets set ALLOWED_ORIGINS='*' MONITOR_PASS="$(openssl rand -hex 12)" JWT_SECRET="$(openssl rand -hex 32)" --app runeword-chronicle-server
fly deploy --config apps/server/fly.toml --dockerfile apps/server/Dockerfile --app runeword-chronicle-server

# 클라 (Vercel) — 5분
vercel login
echo "wss://runeword-chronicle-server.fly.dev" | vercel env add VITE_SERVER_WS production
vercel --prod
```

전체 단계, 트러블슈팅, 비용 비교는 **[`docs/DEPLOY.md`](./docs/DEPLOY.md)** 참고. 무료 tier로 학급 20명 무제한 운영 가능.

## 📚 문서

- [`docs/DEPLOY.md`](./docs/DEPLOY.md) — Vercel + Fly.io 정식 배포 가이드
- [`docs/GDD.md`](./docs/GDD.md) — 게임 디자인 문서
- [`docs/PLAN.md`](./docs/PLAN.md) — 아키텍처 계획
- [`docs/RESEARCH.md`](./docs/RESEARCH.md) — 100+ MMORPG 교차검증
- [`docs/ASSET-LIST.md`](./docs/ASSET-LIST.md) — 에셋 280컷 명세
- [`docs/STATUS.md`](./docs/STATUS.md) — 현재 빌드 상태와 후속 작업

## 🔧 개발 메모

### Colyseus 0.16 schema callbacks
v0.16부터 콜백 API가 변경되었습니다. 클라이언트는 `getStateCallbacks(room)`로 감싸야 합니다:
```typescript
import { getStateCallbacks } from 'colyseus.js';
const $ = getStateCallbacks(room);
$(room.state).players.onAdd((player, key) => { ... });
$(player).onChange(() => { ... });
```

### 단어 큐 알고리즘
서버는 플레이어별 `WordQueue`를 보유하며 **active / cycledCorrect / wrongPool** 3개 풀로 No-Repeat 사이클을 구현합니다. 30% 확률로 오답 풀에서 우선 출제하여 학습 효과를 강화합니다.

## 📝 라이선스

이 게임은 학급 운영 / 학습 목적의 무료 배포를 전제로 작성되었습니다. 재배포 시 출처를 명시해주세요.
