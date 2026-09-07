import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import axios from 'axios';

/**
 * 면허증 사본 보관 — Supabase Storage 의 **비공개** 버킷.
 *
 * 게시글 이미지(UploadService)와 저장소는 같지만 버킷과 규칙이 다르다.
 * 게시글은 공개 URL 을 그대로 돌려주고, 이쪽은 절대 그러지 않는다.
 * 면허증에는 이름·생년월일·면허번호가 한 장에 같이 찍혀 있다. 주소를 아는
 * 사람이면 누구나 여는 자리에 두면, 유출은 사고가 아니라 시간 문제가 된다.
 *
 * 그래서 DB 에는 오브젝트 경로만 남기고, 볼 때마다 짧게 서명한 URL 을
 * 새로 발급한다. 서명 URL 은 만료되므로 어디에 복사돼 남더라도 오래 살지
 * 못한다.
 */

/** 앞부분 바이트로 실제 형식을 본다. 확장자와 Content-Type 은 거짓말을 한다. */
const MAGIC: Array<{ ext: string; mime: string; test: (b: Buffer) => boolean }> = [
  {
    ext: 'jpg',
    mime: 'image/jpeg',
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: 'png',
    mime: 'image/png',
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    ext: 'webp',
    mime: 'image/webp',
    test: (b) =>
      b.slice(0, 4).toString('ascii') === 'RIFF' &&
      b.slice(8, 12).toString('ascii') === 'WEBP',
  },
  {
    // 정부24·보건복지부 면허민원에서 받는 면허(자격)등록증명서가 PDF 로 나온다.
    ext: 'pdf',
    mime: 'application/pdf',
    test: (b) => b.slice(0, 5).toString('ascii') === '%PDF-',
  },
];

/** 10MB. 휴대폰으로 찍은 면허증 사진이 그대로 올라와도 받아 낼 만한 크기다. */
const MAX_BYTES = 10 * 1024 * 1024;

/** 서명 URL 유효시간. 검수하는 동안만 열리면 된다. */
const SIGNED_URL_TTL_SECONDS = 300;

export interface StoredLicenseDocument {
  path: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class LicenseDocumentService {
  private readonly logger = new Logger(LicenseDocumentService.name);

  private get config() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    // 게시글 이미지 버킷과 반드시 분리한다. 그쪽은 공개 버킷이다.
    const bucket = process.env.SUPABASE_LICENSE_BUCKET || 'licenses';
    return { url, key, bucket };
  }

  get available(): boolean {
    const { url, key } = this.config;
    return Boolean(url && key);
  }

  /**
   * 면허증 사본을 올리고 오브젝트 경로를 돌려준다.
   *
   * 파일명은 uuid 로 새로 짓는다. 사용자가 올리는 파일 이름은 대개
   * "홍길동_면허증.jpg" 라서, 그대로 쓰면 경로 자체가 개인정보가 된다.
   */
  async upload(buffer: Buffer, userId: string): Promise<StoredLicenseDocument> {
    const { url, key, bucket } = this.config;
    if (!url || !key) {
      throw new BadRequestException(
        '면허증 보관소가 설정되지 않았습니다. 관리자에게 문의해 주세요.',
      );
    }
    if (!buffer?.length) {
      throw new BadRequestException('빈 파일입니다.');
    }
    if (buffer.length > MAX_BYTES) {
      throw new BadRequestException(
        `면허증 사본은 ${MAX_BYTES / 1024 / 1024}MB 까지 올릴 수 있습니다.`,
      );
    }

    const kind = MAGIC.find((m) => m.test(buffer));
    if (!kind) {
      throw new BadRequestException(
        'JPG, PNG, WebP 이미지 또는 PDF 만 올릴 수 있습니다.',
      );
    }

    const path = `${userId}/${randomUUID()}.${kind.ext}`;

    try {
      await axios.post(`${url}/storage/v1/object/${bucket}/${path}`, buffer, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': kind.mime,
          'x-upsert': 'false',
        },
        maxBodyLength: MAX_BYTES,
        maxContentLength: MAX_BYTES,
        timeout: 30_000,
      });
    } catch (e: any) {
      const detail = e?.response?.data?.message ?? e?.message ?? 'unknown';
      // 사용자 식별자만 남긴다. 파일 내용이나 원본 이름은 로그에 넣지 않는다.
      this.logger.error(`면허증 업로드 실패: userId=${userId}, ${detail}`);
      throw new BadRequestException(
        '면허증을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    }

    return { path, mimeType: kind.mime, size: buffer.length };
  }

  /**
   * 열람용 서명 URL 발급. 몇 분 뒤 만료된다.
   */
  async createSignedUrl(path: string): Promise<{ url: string; expiresInSeconds: number }> {
    const { url, key, bucket } = this.config;
    if (!url || !key) {
      throw new BadRequestException('면허증 보관소가 설정되지 않았습니다.');
    }

    try {
      const res = await axios.post(
        `${url}/storage/v1/object/sign/${bucket}/${path}`,
        { expiresIn: SIGNED_URL_TTL_SECONDS },
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          timeout: 15_000,
        },
      );

      // Supabase 는 '/object/sign/<bucket>/<path>?token=...' 형태의 상대 경로를 준다.
      const signed: string | undefined = res.data?.signedURL ?? res.data?.signedUrl;
      if (!signed) {
        throw new Error('signedURL 이 응답에 없습니다.');
      }

      return {
        url: `${url}/storage/v1${signed.startsWith('/') ? signed : `/${signed}`}`,
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      };
    } catch (e: any) {
      const detail = e?.response?.data?.message ?? e?.message ?? 'unknown';
      this.logger.error(`면허증 열람 URL 발급 실패: ${detail}`);
      throw new BadRequestException('면허증을 여는 데 실패했습니다.');
    }
  }

  /**
   * 사본 삭제. 재제출로 교체될 때 옛 파일을 남겨 두지 않는다.
   * 실패해도 흐름을 막지 않는다 — 새 파일은 이미 올라갔고, 남은 것은 정리 대상일 뿐이다.
   */
  async remove(path: string): Promise<void> {
    const { url, key, bucket } = this.config;
    if (!url || !key) return;

    try {
      await axios.delete(`${url}/storage/v1/object/${bucket}/${path}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        timeout: 15_000,
      });
    } catch (e: any) {
      const detail = e?.response?.data?.message ?? e?.message ?? 'unknown';
      this.logger.warn(`이전 면허증 사본 삭제 실패(무시): ${detail}`);
    }
  }
}
