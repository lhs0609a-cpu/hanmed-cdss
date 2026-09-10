import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

/**
 * 체험 계정은 아무것도 남기지 못한다.
 *
 * 왜 필요한가 — 체험은 계정 하나(demo@ongojisin.ai)를 모든 방문자가 나눠
 * 쓴다. 그런데 free 티어에 환자 명부가 열려 있어서, 체험해 본 사람이 넣은
 * 환자 정보를 다음 방문자가 그대로 봤다. 실제로 환자 14명·진료기록 13건이
 * 나흘에 걸쳐 쌓여 있었다.
 *
 * DEMO_FEATURES 로 기능을 좁혔지만 그것만으로는 모자라다. @RequireFeature
 * 가 안 붙은 컨트롤러가 아직 많고, 새로 만드는 사람이 붙이는 것을 잊으면
 * 그 경로로 다시 열린다. 기능 목록은 "무엇을 보여줄까"의 문제고, 이 가드는
 * "무엇도 남기지 않는다"는 성질을 경로와 무관하게 지킨다.
 *
 * 그래서 쓰기를 통째로 막고, 체험 흐름에 꼭 필요한 계산 요청만 지목해서
 * 연다 — 변증·처방 추천은 POST 로 오지만 아무것도 저장하지 않는다.
 * 허용 목록을 좁게 두고 필요할 때 넓히는 쪽이, 넓게 두고 좁히는 쪽보다
 * 안전하다. 잘못 막으면 체험이 불편해지고, 잘못 열면 남의 환자가 보인다.
 */
@Injectable()
export class DemoReadOnlyGuard implements CanActivate {
  /** 저장하지 않는 계산 요청 — 체험의 핵심 흐름이 이 길로 온다. */
  private static readonly ALLOWED_WRITE_PATHS: RegExp[] = [
    /^\/?api\/?v?1?\/?auth\/(demo-login|refresh|logout)$/,
    // 변증·통합진단·처방 추천 — 결과를 돌려줄 뿐 남기지 않는다.
    /\/(diagnosis|diagnose|analyze|recommend|recommendation)s?(\/|$)/,
    /\/consultation\/(analyze|preview|simulate)(\/|$)/,
    // 검색은 본문이 길어 POST 로 받는 자리가 있다.
    /\/(search|autocomplete|suggest)(\/|$)/,
  ];

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req?.user?.isDemo !== true) return true;

    const method = String(req?.method ?? 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    const path: string = req?.originalUrl ?? req?.url ?? '';
    const bare = path.split('?')[0];
    if (DemoReadOnlyGuard.ALLOWED_WRITE_PATHS.some((re) => re.test(bare))) {
      return true;
    }

    // 402 를 쓴다 — 401(로그인 안 됨)도 403(권한 없음)도 아니고, 다음 걸음이
    // 가입이라는 뜻이다. 화면이 로그인 만료와 구분해 가입 모달을 띄운다.
    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'DEMO_READONLY',
        message:
          '체험판에서는 저장할 수 없습니다. 회원가입하면 내 환자로 바로 기록할 수 있습니다.',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
