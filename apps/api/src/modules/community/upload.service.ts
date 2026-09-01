import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import axios from 'axios';

/**
 * 게시글 이미지 업로드 — Supabase Storage.
 *
 * 에디터에서 붙여넣기·드래그로 들어온 이미지를 받는다. 저장소를 따로 두지 않고
 * Supabase 를 쓰는 이유는 DB 가 이미 거기 있어서다 — 운영할 곳을 하나 더
 * 늘리지 않는다.
 *
 * secret key 는 RLS 를 우회하는 관리 권한이다. 절대 브라우저로 내보내지 않고
 * 서버에서만 쓴다. 그래서 업로드가 프론트에서 Supabase 로 직접 가지 않고
 * 이 엔드포인트를 거친다 — 한 번 더 도는 대신 키가 안전한 쪽에 남는다.
 */

/** 실제로 이미지인지 앞부분 바이트로 확인한다. 확장자와 Content-Type 은 거짓말을 한다. */
const MAGIC: Array<{ ext: string; mime: string; test: (b: Buffer) => boolean }> = [
  {
    ext: 'jpg',
    mime: 'image/jpeg',
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: 'png',
    mime: 'image/png',
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    ext: 'gif',
    mime: 'image/gif',
    test: (b) => b.slice(0, 3).toString('ascii') === 'GIF',
  },
  {
    ext: 'webp',
    mime: 'image/webp',
    test: (b) =>
      b.slice(0, 4).toString('ascii') === 'RIFF' &&
      b.slice(8, 12).toString('ascii') === 'WEBP',
  },
];

/** 10MB. 진료실에서 찍은 사진이 그대로 올라와도 받아 낼 만한 크기다. */
const MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  private get config() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'community';
    return { url, key, bucket };
  }

  get available(): boolean {
    const { url, key } = this.config;
    return Boolean(url && key);
  }

  /**
   * 이미지를 올리고 공개 URL 을 돌려준다.
   *
   * 파일명은 uuid 로 새로 짓는다. 원본 이름을 그대로 쓰면 환자 이름이나
   * 진료 날짜가 파일명에 담긴 사진이 그대로 공개 URL 이 된다 — 실제로 흔하다.
   */
  async uploadImage(
    buffer: Buffer,
    userId: string,
  ): Promise<{ url: string; path: string; mimeType: string; size: number }> {
    const { url, key, bucket } = this.config;
    if (!url || !key) {
      throw new BadRequestException(
        '이미지 저장소가 설정되지 않았습니다. 관리자에게 문의해 주세요.',
      );
    }
    if (!buffer?.length) {
      throw new BadRequestException('빈 파일입니다.');
    }
    if (buffer.length > MAX_BYTES) {
      throw new BadRequestException(
        `이미지는 ${MAX_BYTES / 1024 / 1024}MB 까지 올릴 수 있습니다.`,
      );
    }

    const kind = MAGIC.find((m) => m.test(buffer));
    if (!kind) {
      // 확장자를 바꾼 실행 파일이 이미지로 올라오는 것을 막는다.
      throw new BadRequestException(
        'JPG, PNG, GIF, WebP 이미지만 올릴 수 있습니다.',
      );
    }

    // 날짜 폴더로 나눠 둔다. 한 폴더에 수만 개가 쌓이면 나중에 훑기가 어렵다.
    const day = new Date().toISOString().slice(0, 10);
    const path = `posts/${day}/${randomUUID()}.${kind.ext}`;

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
      this.logger.error(`이미지 업로드 실패: userId=${userId}, ${detail}`);
      throw new BadRequestException('이미지를 올리지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }

    return {
      url: `${url}/storage/v1/object/public/${bucket}/${path}`,
      path,
      mimeType: kind.mime,
      size: buffer.length,
    };
  }
}
