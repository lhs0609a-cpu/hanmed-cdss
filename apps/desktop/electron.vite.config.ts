import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

/**
 * 렌더러 설정은 없다.
 *
 * 이 앱에는 자체 화면이 없다 — 배포된 웹앱(https://ongojisin.ai)을 그대로
 * 띄우는 셸이다. 예전 설정에는 빈 renderer 항목이 남아 있었는데, 그러면
 * electron-vite 가 src/renderer/index.html 을 찾다가 빌드가 멈춘다.
 *
 * 의존성은 전부 번들에 말아 넣는다 (package.json 의 dependencies 가 비어
 * 있는 이유다). externalizeDepsPlugin 은 dependencies 만 밖으로 빼므로,
 * 비어 있으면 electron 과 node 내장 모듈만 외부로 남는다.
 *
 * 이렇게 하지 않으면 이 레포에서는 패키징이 되지 않는다. 루트 .npmrc 가
 * node-linker=hoisted 라 apps/desktop/node_modules 가 만들어지지 않는데,
 * electron-builder 는 그걸 보고 "프로덕션 의존성이 없다"고 판단해 앱 폴더에서
 * pnpm install --production 을 돌린다. 그 명령이 워크스페이스 전체의
 * 개발 의존성을 지워버려서, electron-builder 가 실행 도중 자기 자신을
 * 지우고 죽는다. 프로덕션 의존성이 아예 없으면 그 단계로 가지 않는다.
 */
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
})
