# 랜딩 로고와 기존 모델 이미지

- 사용자 요청: 새 로고를 이미지 생성으로 만들고, `모델` 폴더에 있던 기존 모델 사진을 랜딩에 반영 후 배포.
- 사용 사진: `apps/web/public/brand/model-cutout.webp`. 원본 계열은 `모델/clean/model-cutout-master.png` 및 `모델/clean/Gemini_Generated_Image_ciyhh4ciyhh4ciyh.png`에서 확인했다. 기존 브랜드 모델 이미지이며 실제 의료진 추천·사용 후기나 자격 증명으로 표시하지 않는다.
- 로고: `apps/web/public/brand/logo-knowledge-v1.png`. 내장 `image_gen`으로 생성했고 원본은 보존했다. 랜딩 헤더·푸터, 공통 기본 화면 로고와 favicon에 연결했다. 문서용 단색 벡터 변형은 보존한다.
- 인물과 실제 제품 화면을 겹쳐 배치했다. 체험·가입 CTA와 공개 증례는 유지한다.

## 생성 프롬프트 (내장 image_gen)

Use case: logo-brand. Generate a single final production logo symbol for 온고지신 AI, a Korean medicine clinical knowledge workspace. Asset: square app/website brand mark, no wordmark, absolutely no text or letters. Flat crisp minimalist brand design: deep jade green #12685d rounded-square tile, inside a warm ivory emblem that elegantly combines an open book with one small rising sprout at its center, symbolizing traditional knowledge growing into clinical insight. Bold clear silhouette readable at 32px, restrained and professional, harmonious optical balance. Only one icon centered, fill most of canvas with about 6% outer transparent margin. Genuinely transparent background outside the rounded green square. No mockup, no lighting effects, no gradients, no shadow, no 3D, no medical cross, no extra variants. Save a clean high-quality square raster asset.

## 배포 및 검증

- 소스 커밋 `1d36035`, Vercel `dpl_8QVZa2aEGUAoTFvDjQK78SitMhsy`, Production/Ready.
- 운영 주소: https://www.ongojisin.co.kr
- TypeScript 및 운영 빌드 통과. 320/390/1440px에서 로고·모델 로딩, 가로 넘침 없음, 증례 탭과 원문 링크, 완료 이벤트 중복 방지, 요금 비교 및 가입 이동 통과. 광고 3개 경로와 게스트 진입도 확인했다.
- 운영 브라우저 결과와 스크린샷: `output/landing-conversion/live-checks.json`, `live-hero-390.png`, `live-hero-1440.png`.
