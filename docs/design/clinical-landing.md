# 온고지신 AI 홈페이지 구현

2026-09-09. 목표: 의료진이 제품의 목적을 이해하고, 사용 흐름을 직접 확인하고, 제공 범위와 요금을 확인한 뒤 가입하거나 실제 앱을 체험할 수 있게 한다.

## 구성과 디자인

- 웜화이트 #F7F8F5, 먹색 #172D28, 딥틸 #12685D, 세이지 계열 보조 표면.
- 기존 촌관척 로고의 `bare` 벡터를 재사용. 한국어 본문은 기존 Pretendard 스택을 유지.
- 히어로 → 기존 공개 통계 → 3개 샘플 케이스 데모 → 핵심 가치 → 실제 제품 화면 3종 → 근거 확인과 신뢰 → 진료 흐름 → 4개 요금제와 부가서비스 → FAQ → 가입·게스트 체험.
- 이미지 3종은 장식 및 개념 설명용. 의학적 근거, 고객 후기, 실제 도입 기관 사진으로 표현하지 않는다.
- 실제 제품 화면은 기존 `/screens/pattern.webp`, `cases.webp`, `formulas.webp`를 유지한다.
- 전체 스타일은 `.clinical-landing`에 한정해 진료 앱과 인쇄 화면의 기존 토큰을 보존한다.

## 기능 연결

- 회원가입 `/register`, 로그인 `/login`, 게스트 체험 `/dashboard`.
- 이미 로그인한 사용자는 게스트 진입으로 인증 상태를 잃지 않는다.
- 월·연 가격은 기존 `PricingData.ts`를 사용한다. 연 결제는 연 총액을 표시한다.
- 치험례·문헌·약재·처방 수는 기존 `usePublicStats` 사용. API 실패 시 기존 폴백을 표시하고 기준 문구를 구분한다.
- 문의는 기존 주소 `lhs0609c@naver.com`의 메일 작성 링크다. 문의가 제출되었다는 가짜 성공 상태를 만들지 않는다.
- 데모는 3개 가상 케이스, 소견 정리/관련 기록/검토 내용 3단계, 근거 항목 펼치기, 검토 완료 상태를 제공한다. 실시간 AI 요청, 처방 추천, 환자 기록 저장은 수행하지 않는다.
- 키보드 좌우/Home/End 탭 탐색, FAQ 펼침 상태, 메뉴 Escape 닫기, 본문 바로가기, 모션 감소 설정을 지원한다.
- 서버 측 크롤러용 기본 HTML 메타와 런타임 SEO를 함께 수정하고 PNG 공유 이미지를 제공한다. 로그인 페이지의 noindex가 홈페이지로 전파되지 않게 SEO 훅을 보완한다.

## 전환 이벤트

`components/useLandingTracking.ts`가 아래 이벤트를 기존 `window.gtag`가 설치된 경우 전달하며, `ongojisin:landing-event` 커스텀 이벤트로도 알린다. 세션 진단은 `sessionStorage.ongojisin_landing_events`에 최대 50개까지만 보관한다. 환자 정보, 입력 자유문, 계정·이메일을 이벤트에 포함하지 않는다. Do Not Track=1이면 수집하지 않는다.

- `landing_page_view`
- `landing_demo_start`
- `demo_case_selected`, `demo_step_selected`, `demo_evidence_opened`, `demo_completed`
- `landing_signup_header`, `landing_signup_hero`, `landing_signup_mobile`, `landing_signup_footer`
- `landing_guest_try`, `landing_contact`, `landing_addon_contact`
- `landing_billing_monthly`, `landing_billing_annual`, `landing_plan_{plan}_{period}`

비로그인 방문자에게 인증이 필요한 임상 통계 API를 호출하지 않는다. 외부 분석 제공자가 설치되지 않은 환경에서는 중앙 서버 집계가 이루어지지 않는다. 실제 GA 속성/동의 설정과 가입 완료 이벤트 연결은 운영 환경에서 확인해야 한다. CTA 클릭은 가입 완료로 집계하지 않는다.

## 이미지와 재현

원본: `output/imagegen/clinical/`. 서비스용 WebP 및 공유 PNG: `apps/web/public/brand/clinical/`. 생성 프롬프트 전체는 [clinical-landing-images.md](clinical-landing-images.md).

`scripts/prepare-clinical-images.py`는 원본을 보존하고 웹용 크기와 인코딩만 최적화한다. `apps/web/scripts/check-clinical-landing.mjs`는 브라우저 검증, 반응형 스크린샷, 1200×630 공유 이미지를 생성한다.

```powershell
# 앱 디렉터리에서 로컬 미리보기
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4175 --strictPort
# 다른 터미널에서
node scripts/check-clinical-landing.mjs
# 저장소 루트에서
npm.cmd run build:web
```

검증 스크립트는 공개 통계를 고정 데이터로 모킹하며, 실제 진료 API에 데이터를 쓰지 않는다. 결과와 스크린샷은 `output/clinical-landing/`에 저장한다. 실사용 Core Web Vitals의 75백분위 값은 출시 후 현장 데이터로 확인해야 하며, 로컬 화면 검증을 성능 인증으로 간주하지 않는다.

## 리서치 기반

- [Linear](https://linear.app/): 제품 화면과 업무 흐름을 중심으로 구성.
- [Stripe](https://stripe.com/): 가치 제안과 제품의 구체적인 사용 장면 연결.
- [Heidi](https://www.heidihealth.com/): 의료진의 업무와 제품 체험 중심.
- [Abridge](https://www.abridge.com/): 임상 흐름, 근거, 고객 사례 연결.
- [Web Vitals](https://web.dev/articles/vitals), [WCAG](https://www.w3.org/WAI/WCAG22/quickref/): 성능과 접근성 검증 기준.

외부 사례는 설계 참고이며 전환율 향상이나 의료 효과를 보장하는 근거로 사용하지 않는다. 공개 배포는 이 작업의 로컬 구현과 별개다.
