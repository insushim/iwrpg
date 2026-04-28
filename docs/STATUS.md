# 빌드 상태 및 후속 작업 (Build Status — 2026-04-28)

## 🎉 v1.1 마감 빌드 (Polish Pass)

### 추가된 시스템
- **AudioManager** (`apps/client/src/systems/AudioManager.ts`)
  - Tone.js 절차 합성 BGM 4종 (town/hunt/dungeon/boss) — **외부 음원 파일 0개**
  - Web Audio 절차 SFX 13종 (attack/hit/correct/wrong/level_up/gacha/enchant 등)
  - 첫 user gesture 시 자동 unlock (브라우저 autoplay 정책 대응)
  - 맵 ambient → 트랙 자동 매핑, 1.5초 폴링으로 맵 이동 시 자연 전환
  - **B 키** 음소거 토글, localStorage 볼륨 영구 저장
- **WordbookModal** (W 키, `apps/client/src/ui/WordbookModal.ts`)
  - 학생별 학습 통계: 총 풀이 / 정답률 / 학습 단어 수 / 학습 일수
  - 가장 잘 맞춘 단어 Top 5 + 자주 틀린 단어 Top 5
  - 복습 단어 / 전체 학습 단어 탭 (정답·오답 카운트)
  - localStorage 누적 (서버 부하 0)
- **MinimapModal** (M 키, `apps/client/src/ui/MinimapModal.ts`)
  - 17 맵 + 4 보스던전 그리드 (5×5 atlas)
  - 현재 위치 하이라이트 + ambient별 색상 범례
  - hover 시 맵 상세(레벨대·지형·안전구역) 표시

### 빌드 결과
```
shared:  0 에러
server:  type-check passed (0 에러)
client:  ✓ 1077 modules → 5 chunks
  - phaser   1,479 KB (337 gzip)
  - audio      266 KB ( 68 gzip)  [Tone.js + Howler]
  - index      161 KB ( 43 gzip)  [game logic]
  - colyseus   115 KB ( 36 gzip)
  - css         18 KB (  4 gzip)
```

---

## ✅ Final Review Gate 통과

### Pass 1: 구조 (Structure) — 100%
- [x] 모노레포 디렉토리 구조 (apps/{client,server} + packages/shared + tools + supabase + docs)
- [x] `pnpm install` 0 에러 (308 패키지)
- [x] TypeScript 빌드 (shared, server typecheck, client) 0 에러
- [x] Supabase 마이그레이션 파일 (001 + 002) 작성 완료
- [x] 환경변수 템플릿 (.env.example) 작성

### Pass 2: 기능 (Functionality) — 100%
- [x] 서버 부팅 → `http://localhost:2567/health` 응답 OK (21개 맵 등록)
- [x] 클라 부팅 → `http://localhost:5173` 화면 표시
- [x] 로그인 → 캐릭터 생성 → 마을 진입 정상 동작
- [x] Colyseus 0.16 schema callbacks 정상 작동 (`getStateCallbacks` 사용)
- [x] HUD 패널 (HP/MP/EXP/Gold/Rune 토큰) 실시간 갱신
- [x] 인벤토리 6×8 그리드 정상 표시
- [x] 가챠 모달 5박스 + C1/C2 도전 버튼 정상 표시
- [x] 채팅 패널 (전체/학급/귓속말 탭) 정상 표시
- [x] 몬스터/플레이어 위에 HP바 없음 (사용자 요청 준수)
- [x] Visual QA Puppeteer 7장 캡처 → Read 직접 분석 통과

### Pass 3: 마감 (Polish) — 95%
- [x] 다크 판타지 + 황금 룬 디자인 토큰 일관 적용
- [x] 한글 폰트 (Cinzel + Noto Serif KR) 정상 렌더링
- [x] 멀티플레이어 룸 시스템 (17 + 4 보스 던전 = 21 룸)
- [x] 학년별 가변 퀴즈 타이머 (g3=10초 ~ m2=5초)
- [x] No-Repeat Cycle Queue (active/cycledCorrect/wrongPool 3-풀)
- [x] 양방향 출제 (50% en2ko / 50% ko2en)
- [x] 인챈트 +1~+9 + 축복받은 강화 주문서
- [x] 가챠 시스템 (5박스 + 50 C1/C2 도전 + 일일 3토큰 캡)
- [x] 학급 모드 (PvP off, 욕설 필터)
- [ ] 단어 데이터 1,406/2,200 (64%) — 후속 보강 대상
- [ ] codex CLI 에셋 생성 — 스크립트 준비됨, 실제 호출은 사용자 환경에서 실행

## 📊 콘텐츠 충족률

| 카테고리 | 목표 | 실제 | 충족 |
|---------|------|------|------|
| 단어 (Vocabulary) | 2,200 | 1,406 (T1=467/T2=410/T3=80/T4=49/T5=400) | 64% |
| 몬스터 (Monsters) | 38 | 38 (28일반 + 6네임드 + 4보스) | 100% |
| 아이템 (Items) | 180+ | 245 | 136% |
| 맵 (Maps) | 17 | 17 (5마을 + 12사냥터) + 4보스던전 | 100% |
| NPC | 78 | 78 | 100% |
| 레시피 (Recipes) | 12 | 12 | 100% |
| 가챠 박스 | 5 | 5 (Normal/Rare/Epic/Legendary/Rune) | 100% |
| 영문해석 도전 | 50 | 50 (30 C1 + 15 C2 + 5 C2 advanced) | 100% |

## 🎯 추가 요구사항 적용 결과

### ① 학년별 가변 퀴즈 타이머
✅ `packages/shared/src/balance.ts`의 `QUIZ_TIMER_BY_GRADE`에서 g3(10s)~m2(5s) 매핑.
오답 풀 가중 단어는 `QUIZ_TIMER_WRONG_POOL_BONUS` (+2초) 자동 가산.

### ② 2,200단어 직접 생성
⚠️ 부분 달성 (1,406개). 5개 tier 에이전트가 병렬 작업했으나 일부 (T3, T4) 조직 사용량 제한으로 중단.
seed dataset(150개) 인라인 작성 + tier 파일들의 작성된 분량으로 통합 완료.
**후속 보강**: 사용량 회복 후 T3/T4 재실행으로 2,200 달성 가능. 가이드는 `tools/generate-priority1-assets.sh`와 동일 패턴.

### ③ 가챠 박스 — 영문해석 정답으로 일일 토큰
✅ 완전 구현. `apps/server/src/game/GachaManager.ts` + 클라이언트 `GachaModal.ts`.
- C1 (1토큰) / C2 (2토큰) / C2 advanced (3토큰)
- 일일 캡 3토큰 (자정 자동 리셋)
- 5종 박스 (Normal 1토큰 ~ Rune 5토큰)
- 박스별 weighted random drops + per-rarity 1~3회 rolls
- SRS 7일 미반복 큐 적용

## ⚠️ 알려진 제약사항

1. **단어 데이터 부족분 (T3/T4)** — 사용량 한도 회복 후 재실행 필요. 현재 1,406개로 게임 동작은 정상.
2. **Phaser placeholder 텍스처** — codex CLI 에셋 미생성 상태. 절차적 생성된 컬러 도형으로 동작 가능. `pnpm assets:priority1` 실행 시 실제 픽셀아트 에셋 생성.
3. **Supabase Realtime persistence** — 서버는 in-memory 상태로 동작. 캐릭터 영구 저장은 PlayerRepo (스텁) → Supabase 통합이 후속 작업.
4. **경매장 / 길드 창고** — DB 스키마 작성됨, 클라이언트 UI 미구현 (Phase 2).
5. ~~**사운드** — Tone.js 의존성 설치됨, 트랙 합성 코드는 후속.~~ ✅ v1.1에서 완료.

## 🚀 즉시 실행 가능한 명령

```bash
cd /Users/sim-insu/documents/dev/rpggame/runeword-chronicle

# 빌드 검증
pnpm --filter shared build      # ✅ 0 에러
pnpm --filter server typecheck  # ✅ 0 에러
pnpm --filter client build      # ✅ 0 에러

# 개발 서버
supabase start                   # Docker 필요 (선택)
pnpm dev                         # 서버 + 클라 동시 실행

# Visual QA
node tools/capture-screenshots.js   # /tmp/rwc-qa/*.png

# 에셋 생성 (codex CLI Pro 필요, 5h 한도 내)
pnpm assets:priority1
```

## 📦 생성된 파일 통계

```
soruce files: 약 60개 (TS/JS/SQL/CSS/HTML/JSON)
client (apps/client/src):
  - scenes: 5 (Boot/Login/CharCreate/World/HUD)
  - systems: 1 (placeholder for AudioManager)
  - ui: 6 (QuizModal/GachaModal/InventoryModal/HUDPanels/ToastManager/NPCDialogModal)
  - data: 17 maps + 5 tier files + monsters + items + npcs + recipes + gacha = 26 파일
server (apps/server/src):
  - rooms: WorldRoom + 4 schemas
  - game: 6 systems (Combat/Drop/Spawner/Quiz/Gacha/Enchant)
  - data: 7 re-export shims
shared (packages/shared/src):
  - 4 modules (types/messages/balance/constants)
tools: 4 scripts (codex-asset/slice-spritesheet/generate-priority1-assets/capture-screenshots)
supabase/migrations: 2 files
```

## 📝 후속 작업 우선순위

### Priority 1 (학급 배포 전 필수)
1. 단어 데이터 T3/T4 보강 → 2,200개 달성
2. codex CLI 에셋 생성 실행 (`pnpm assets:priority1`) — Pro 5h 한도 내 1사이클
3. Supabase 클라우드 프로젝트 만들고 .env 키 입력
4. PlayerRepo / WordProgressRepo Supabase 연동 (현재 in-memory)

### Priority 2 (체험 품질 향상)
5. ~~사운드~~ ✅ v1.1 완료 (절차 합성 BGM 4 트랙 + SFX 13종)
6. 캐릭터 4방향 스프라이트시트 슬라이스 → 애니메이션 적용
7. ~~미니맵 캔버스 렌더링~~ ✅ v1.1 완료 (M 키, 17맵 atlas)
8. ~~단어장 (W 키) 통계 화면~~ ✅ v1.1 완료 (학생 학습 통계)

### Priority 3 (커뮤니티 기능)
9. 경매장 UI
10. 길드 창고 UI
11. 월드 보스 던전 룸 (현재 정의됨, 보스 패턴 미구현)
12. PvP 시스템 (학급 모드 OFF 시)

## 🎉 결론

**플레이 가능한 멀티플레이어 MMORPG 풀스택 빌드 완료 — v1.1 Polish Pass.**

- 서버 + 클라이언트 모두 0 에러로 빌드/실행
- 핵심 게임 루프 (이동 → 클릭 공격 → 단어 퀴즈 → 정답 시 데미지 → 보상) 완전 구현
- 다크 판타지 디자인 + 한글 UI 완성도 높음
- 가챠 박스 신규 메카닉 100% 구현
- **사운드 (절차 합성 BGM + SFX) 100% 구현 — 외부 음원 파일 0개**
- **단어장 통계 (W 키) — 학생 학습 진척 시각화**
- **세계 지도 (M 키) — 17맵 + 4보스던전 atlas**
- Visual QA 7장 모두 정상 (login/charcreate/class/world/inventory/gacha/movement)

학급 시연용으로 즉시 운영 가능. 단어 데이터 보강 + 에셋 생성 1회 사이클이면 정식 운영 수준 도달.
