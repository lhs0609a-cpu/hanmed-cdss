# 운영 API에 연결하는 로컬 미리보기

## 수정한 원인

기존 `.env.local`의 `VITE_API_URL=http://localhost:3001/api/v1`이 빌드에 포함되었다. 로컬 백엔드가 없으면 모든 로그인 요청이 연결 거부된다. 운영 API 주소를 직접 넣는 것만으로는 운영 서버의 CORS 정책 때문에 로컬 미리보기에서 접근할 수 없다.

## 실행

`apps/web`에서:

```powershell
npm.cmd run build:connected
npm.cmd run preview:connected
```

접속: http://127.0.0.1:4176/

`connected` 모드만 API 주소를 `/api/v1`로 고정하고, Vite의 미리보기 프록시가 `https://api.ongojisin.co.kr`로 전달한다. 브라우저와의 통신은 동일 출처다. 운영 API의 CORS 정책과 개발용 `.env.local`은 변경하지 않는다. 프록시는 루프백 주소에만 바인딩한다.

번들은 `.preview-dist/`에 저장한다. 일반 배포용 `dist/`와 혼용하지 않는다. 운영 웹 배포 설정을 바꾸는 작업이 아니다. 이 미리보기에서 로그인·환자 정보·기록 작업은 운영 API에 연결된다.

## 검증

```powershell
npm.cmd run check:connection
```

실제 운영 API의 상태 확인 응답과 로그인 경로의 입력 검증 응답을 브라우저에서 확인한다. 로그인 제출 본문을 빈 객체로 바꿔 DTO 검증 단계에서 거부되게 하므로 계정 비밀번호를 보내거나 계정 잠금을 유발하지 않는다. 서버 응답은 모킹하지 않는다. 성공적인 계정 인증 자체를 검증했다고 주장하지 않는다.

결과: `output/clinical-landing/api-connection-verification.json`.

로그인 오류 문구도 실제 오프라인일 때만 인터넷 연결을 안내하고, 온라인 상태의 연결 실패는 로그인 서버 오류로 안내하도록 수정했다.
