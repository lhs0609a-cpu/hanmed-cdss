/**
 * 로그인 실패를 사람이 읽고 바로 행동할 수 있는 안내로 바꾼다.
 *
 * 서버는 이유를 코드로 갈라 보낸다(EMAIL_NOT_FOUND, WRONG_PASSWORD,
 * OLD_PASSWORD, ACCOUNT_LOCKED …). 화면이 할 일은 그 코드마다 다음에 눌러야
 * 할 것을 함께 보여주는 것이다. "비밀번호가 틀렸습니다" 만 띄우고 끝내면,
 * 정작 필요한 것(가입하러 가기 / 비밀번호 재설정)을 사람이 스스로 찾아야 한다.
 *
 * 흔한 이메일 오타는 여기서 짚는다. naver.con, gmial.com 처럼 한 글자 어긋난
 * 주소는 "등록되지 않은 이메일" 로만 알려 주면 사람이 같은 오타를 다시 낸다.
 */

export interface LoginErrorView {
  /** 서버가 준 코드. 화면 분기에만 쓴다. */
  code: string
  /** 본문. 서버 문장을 그대로 쓰되, 코드에 따라 우리가 덧붙인다. */
  message: string
  /** 눌러서 갈 곳. 없으면 안내만 한다. */
  action?: { label: string; to?: string; kind?: 'reset' | 'signup' | 'support' }
  /** 어느 칸을 고쳐야 하는지. 그 칸에 포커스를 준다. */
  focus?: 'email' | 'password'
  /** 오타로 보이는 이메일의 교정 제안. */
  suggestion?: string
}

/** 흔히 잘못 적는 도메인 → 맞는 도메인 */
const DOMAIN_TYPOS: Record<string, string> = {
  'naver.con': 'naver.com',
  'naver.co': 'naver.com',
  'navr.com': 'naver.com',
  'nave.com': 'naver.com',
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'hanmail.ne': 'hanmail.net',
  'hanmail.com': 'hanmail.net',
  'daum.ne': 'daum.net',
  'daum.com': 'daum.net',
  'kakao.co': 'kakao.com',
  'outlook.co': 'outlook.com',
  'hotmail.co': 'hotmail.com',
}

export function suggestEmail(email: string): string | undefined {
  const at = email.lastIndexOf('@')
  if (at < 0) return undefined
  const local = email.slice(0, at)
  const domain = email.slice(at + 1).toLowerCase()
  const fixed = DOMAIN_TYPOS[domain]
  return fixed ? `${local}@${fixed}` : undefined
}

/** 서버 오류 응답에서 코드와 문장을 꺼낸다. */
function unwrap(err: unknown): { code: string; message: string; status?: number } {
  const anyErr = err as {
    response?: { status?: number; data?: { error?: string; message?: string | string[] } }
    message?: string
  }
  const data = anyErr?.response?.data
  const raw = data?.message
  return {
    code: data?.error ?? 'UNKNOWN',
    message: Array.isArray(raw) ? raw.join(' ') : (raw ?? anyErr?.message ?? '로그인에 실패했습니다.'),
    status: anyErr?.response?.status,
  }
}

export function toLoginErrorView(err: unknown, email: string): LoginErrorView {
  const { code, message, status } = unwrap(err)

  switch (code) {
    case 'EMAIL_NOT_FOUND': {
      const suggestion = suggestEmail(email)
      return {
        code,
        message: suggestion
          ? '등록되지 않은 이메일입니다. 혹시 아래 주소를 쓰려던 것은 아닌가요?'
          : '등록되지 않은 이메일입니다. 오타가 없는지 확인해 주세요.',
        suggestion,
        focus: 'email',
        action: { label: '이 이메일로 가입하기', to: '/register', kind: 'signup' },
      }
    }
    case 'WRONG_PASSWORD':
      return {
        code,
        message,
        focus: 'password',
        action: { label: '비밀번호를 잊으셨나요?', to: '/forgot-password', kind: 'reset' },
      }
    case 'OLD_PASSWORD':
      return {
        code,
        message,
        focus: 'password',
        action: { label: '비밀번호 재설정', to: '/forgot-password', kind: 'reset' },
      }
    case 'ACCOUNT_LOCKED':
      return {
        code,
        message,
        action: { label: '비밀번호 재설정으로 바로 풀기', to: '/forgot-password', kind: 'reset' },
      }
    case 'ACCOUNT_SUSPENDED':
    case 'ACCOUNT_BANNED':
      return {
        code,
        message,
        action: { label: '고객센터 문의', kind: 'support' },
      }
    case 'EMAIL_NOT_VERIFIED':
      return {
        code,
        message,
        action: { label: '인증 메일 다시 받기', kind: 'support' },
      }
    default:
      // 서버가 코드를 안 줬거나 우리가 모르는 코드. 상태만으로 갈린다.
      if (status === 429) {
        return {
          code: 'TOO_MANY_REQUESTS',
          message:
            '시도가 너무 잦습니다. 1분 뒤에 다시 시도해 주세요. 비밀번호가 기억나지 않으면 재설정이 빠릅니다.',
          action: { label: '비밀번호 재설정', to: '/forgot-password', kind: 'reset' },
        }
      }
      if (status === 0 || status === undefined) {
        return {
          code: 'NETWORK',
          message: '서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.',
        }
      }
      return { code, message }
  }
}
