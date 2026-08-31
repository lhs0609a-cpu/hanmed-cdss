import { DataSource } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { dataSourceOptions } from '../data-source';
import { User } from '../entities/user.entity';
import { UserRole, UserStatus } from '../entities/enums';

/**
 * 커뮤니티 운영팀 계정 생성.
 *
 * 시드 글의 작성자로만 쓰는 계정이다. 왜 개인 계정을 쓰지 않는가:
 *   - 게시판에 작성자가 그대로 표시된다. super_admin 계정은 이름이 이메일로
 *     돼 있어서, 그걸 쓰면 원장 개인 네이버 주소가 공개 글 수십 편에 박힌다.
 *   - 담당자가 바뀌어도 글은 남는다. 개인에 묶어 두면 나중에 계정을 정리할 때
 *     글까지 딸려 간다.
 *
 * 권한은 CONTENT_MANAGER 다. 글을 쓰는 데 필요한 최소치이고, 이 계정으로
 * 결제나 사용자 관리에 손댈 일은 없다.
 *
 * 비밀번호는 무작위로 만들고 어디에도 출력하지 않는다. 이 계정은 사람이
 * 로그인할 일이 없다 — 글은 시드 스크립트가 올린다. 나중에 로그인이
 * 필요해지면 비밀번호 재설정으로 받으면 된다. 출력해서 화면·로그·대화기록에
 * 남기는 순간 그게 공유 자격증명이 된다.
 *
 * 멱등: 같은 이메일이 이미 있으면 만들지 않고 그대로 둔다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/create-ops-account.ts
 *   ... --email=team@ongojisin.ai --name='온고지신 운영팀'
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const EMAIL = argValue('email') ?? 'team@ongojisin.ai';
const NAME = argValue('name') ?? '온고지신 운영팀';

async function main(): Promise<void> {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  try {
    const repo = ds.getRepository(User);
    const existing = await repo.findOne({ where: { email: EMAIL } });
    if (existing) {
      console.log(`이미 있습니다 — ${existing.name} <${existing.email}> (${existing.role})`);
      return;
    }

    // 로그인용이 아니라 계정을 유효하게 만들기 위한 값이다. 출력하지 않는다.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);

    const user = repo.create({
      email: EMAIL,
      name: NAME,
      passwordHash,
      role: UserRole.CONTENT_MANAGER,
      status: UserStatus.ACTIVE,
      // 운영팀 계정이므로 인증 절차를 다시 밟을 필요가 없다.
      isVerified: true,
    });
    const saved = await repo.save(user);

    console.log(`생성 — ${saved.name} <${saved.email}> (${saved.role})`);
    console.log(
      '비밀번호는 무작위로 만들고 출력하지 않았습니다. ' +
        '이 계정으로 로그인할 일이 생기면 비밀번호 재설정을 이용하세요.',
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(`실패: ${(e as Error).message}`);
  process.exit(1);
});
