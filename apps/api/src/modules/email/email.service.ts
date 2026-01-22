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
}
