import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP 설정이 없습니다. 이메일 기능이 비활성화됩니다.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    this.logger.log('이메일 트랜스포터가 초기화되었습니다.');
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('이메일 트랜스포터가 초기화되지 않았습니다.');
      // 개발 환경에서는 콘솔에 토큰 출력
      this.logger.log(`[DEV] 비밀번호 재설정 토큰: ${resetToken}`);
      this.logger.log(`[DEV] 이메일: ${email}`);
      return true;
    }

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from:
        this.configService.get<string>('SMTP_FROM') ||
        '"온고지신 AI" <noreply@hanmed.com>',
      to: email,
      subject: '[온고지신 AI] 비밀번호 재설정',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #14b8a6; font-size: 24px; margin: 0;">온고지신 AI</h1>
              </div>

              <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">비밀번호 재설정</h2>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                비밀번호 재설정을 요청하셨습니다.<br>
                아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(to right, #14b8a6, #10b981); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                  비밀번호 재설정
                </a>
              </div>

              <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
                이 링크는 1시간 동안 유효합니다.<br>
                비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시해주세요.
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
                <a href="${resetUrl}" style="color: #14b8a6; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>

            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
              © 온고지신 AI - 이종대 한의학 연구소
            </p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`비밀번호 재설정 이메일 전송 완료: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`이메일 전송 실패: ${error.message}`);
      return false;
    }
  }

  /**
   * 체험 시작 알림 이메일
   */
  async sendTrialStartEmail(
    email: string,
    userName: string,
    trialEndsAt: Date,
    aiLimit: number,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`[DEV] 체험 시작 알림: ${email}, 종료일: ${trialEndsAt}`);
      return true;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const endDate = trialEndsAt.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM') || '"온고지신 AI" <noreply@ongojisin.ai>',
      to: email,
      subject: '[온고지신 AI] 무료 체험이 시작되었습니다!',
      html: this.getEmailTemplate({
        title: '무료 체험이 시작되었습니다!',
        content: `
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            안녕하세요 ${userName}님,<br><br>
            온고지신 AI Professional 플랜 14일 무료 체험이 시작되었습니다.
          </p>

          <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #166534; margin: 0 0 12px 0;">체험 혜택</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
              <li>AI 진료 상담 ${aiLimit}회</li>
              <li>6,000+ 치험례 무제한 검색</li>
              <li>약물 상호작용 검사</li>
              <li>체험 후 자동결제 없음</li>
            </ul>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            체험 종료일: <strong>${endDate}</strong>
          </p>
        `,
        buttonText: '지금 시작하기',
        buttonUrl: `${frontendUrl}/dashboard/consultation`,
      }),
    };

    return this.sendMail(mailOptions);
  }

  /**
   * 체험 종료 임박 알림 이메일
   */
  async sendTrialEndingEmail(
    email: string,
    userName: string,
    daysRemaining: number,
    trialEndsAt: Date,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`[DEV] 체험 종료 임박 알림: ${email}, 남은 일수: ${daysRemaining}`);
      return true;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const endDate = trialEndsAt.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM') || '"온고지신 AI" <noreply@ongojisin.ai>',
      to: email,
      subject: `[온고지신 AI] 무료 체험이 ${daysRemaining}일 후 종료됩니다`,
      html: this.getEmailTemplate({
        title: `체험 기간이 ${daysRemaining}일 남았습니다`,
        content: `
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            안녕하세요 ${userName}님,<br><br>
            온고지신 AI 무료 체험 기간이 곧 종료됩니다.<br>
            체험 종료 후에도 계속 서비스를 이용하시려면 유료 플랜을 구독해주세요.
          </p>

          <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #92400e; margin: 0;">
              <strong>체험 종료일:</strong> ${endDate}
            </p>
          </div>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            체험 기간 동안 온고지신 AI가 도움이 되셨나요?<br>
            월 19,900원부터 시작하는 합리적인 가격으로 계속 이용하실 수 있습니다.
          </p>
        `,
        buttonText: '요금제 보기',
        buttonUrl: `${frontendUrl}/subscription`,
      }),
    };

    return this.sendMail(mailOptions);
  }

  /**
   * 체험 만료 알림 이메일
   */
  async sendTrialExpiredEmail(
    email: string,
    userName: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`[DEV] 체험 만료 알림: ${email}`);
      return true;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM') || '"온고지신 AI" <noreply@ongojisin.ai>',
      to: email,
      subject: '[온고지신 AI] 무료 체험이 종료되었습니다',
      html: this.getEmailTemplate({
        title: '무료 체험이 종료되었습니다',
        content: `
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            안녕하세요 ${userName}님,<br><br>
            온고지신 AI 무료 체험 기간이 종료되어 Free 플랜으로 전환되었습니다.
          </p>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            체험 기간 동안 온고지신 AI를 이용해주셔서 감사합니다.<br>
            더 많은 기능을 이용하시려면 유료 플랜을 구독해주세요.
          </p>

          <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #1f2937; margin: 0 0 12px 0;">Free 플랜에서 제공되는 기능</h3>
            <ul style="color: #6b7280; margin: 0; padding-left: 20px;">
              <li>AI 진료 상담 10회/월</li>
              <li>기본 검색 기능</li>
              <li>커뮤니티 읽기</li>
            </ul>
          </div>
        `,
        buttonText: '업그레이드하기',
        buttonUrl: `${frontendUrl}/subscription`,
      }),
    };

    return this.sendMail(mailOptions);
  }

  /**
   * 결제 실패 알림 이메일
   */
  async sendPaymentFailedEmail(
    email: string,
    userName: string,
    errorMessage: string,
    retryCount: number,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`[DEV] 결제 실패 알림: ${email}, 오류: ${errorMessage}`);
      return true;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM') || '"온고지신 AI" <noreply@ongojisin.ai>',
      to: email,
      subject: '[온고지신 AI] 결제 실패 알림',
      html: this.getEmailTemplate({
        title: '결제 처리에 실패했습니다',
        content: `
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            안녕하세요 ${userName}님,<br><br>
            구독 결제 처리 중 문제가 발생했습니다.
          </p>

          <div style="background-color: #fef2f2; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #dc2626; margin: 0;">
              <strong>오류 내용:</strong> ${errorMessage}
            </p>
          </div>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            ${retryCount < 3
              ? `시스템에서 자동으로 결제를 재시도합니다. (재시도 ${retryCount}/3회)<br>문제가 지속되면 카드 정보를 확인해주세요.`
              : '자동 재시도 횟수를 초과했습니다. 카드 정보를 업데이트해주세요.'
            }
          </p>
        `,
        buttonText: '결제 수단 관리',
        buttonUrl: `${frontendUrl}/subscription`,
      }),
    };

    return this.sendMail(mailOptions);
  }

  /**
   * 구독 갱신 성공 알림 이메일
   */
  async sendSubscriptionRenewedEmail(
    email: string,
    userName: string,
    planName: string,
    amount: number,
    nextBillingDate: Date,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`[DEV] 구독 갱신 알림: ${email}, 플랜: ${planName}`);
      return true;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const nextDate = nextBillingDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedAmount = new Intl.NumberFormat('ko-KR').format(amount);

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM') || '"온고지신 AI" <noreply@ongojisin.ai>',
      to: email,
      subject: '[온고지신 AI] 구독이 갱신되었습니다',
      html: this.getEmailTemplate({
        title: '구독이 성공적으로 갱신되었습니다',
        content: `
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            안녕하세요 ${userName}님,<br><br>
            온고지신 AI 구독이 정상적으로 갱신되었습니다.
          </p>

          <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #166534; margin: 0 0 8px 0;"><strong>플랜:</strong> ${planName}</p>
            <p style="color: #166534; margin: 0 0 8px 0;"><strong>결제 금액:</strong> ${formattedAmount}원</p>
            <p style="color: #166534; margin: 0;"><strong>다음 결제일:</strong> ${nextDate}</p>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            결제 내역은 요금제 페이지에서 확인하실 수 있습니다.
          </p>
        `,
        buttonText: '결제 내역 보기',
        buttonUrl: `${frontendUrl}/subscription`,
      }),
    };

    return this.sendMail(mailOptions);
  }

  /**
   * 공통 이메일 템플릿
   */
  private getEmailTemplate(options: {
    title: string;
    content: string;
    buttonText?: string;
    buttonUrl?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #14b8a6; font-size: 24px; margin: 0;">온고지신 AI</h1>
            </div>

            <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">${options.title}</h2>

            ${options.content}

            ${options.buttonText && options.buttonUrl ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="${options.buttonUrl}" style="display: inline-block; background: linear-gradient(to right, #14b8a6, #10b981); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                  ${options.buttonText}
                </a>
              </div>
            ` : ''}

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              이 이메일은 온고지신 AI 서비스에서 발송되었습니다.<br>
              문의사항이 있으시면 support@ongojisin.ai로 연락주세요.
            </p>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
            © 머프키치 - 온고지신 AI
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 이메일 전송 공통 메서드
   */
  private async sendMail(mailOptions: nodemailer.SendMailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`이메일 전송 완료: ${mailOptions.to}`);
      return true;
    } catch (error) {
      this.logger.error(`이메일 전송 실패: ${error.message}`);
      return false;
    }
  }
}
