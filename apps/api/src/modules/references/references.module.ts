import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reference } from '../../database/entities/reference.entity';
import { ReferencesService } from './references.service';
import { ReferenceIngestService } from './reference-ingest.service';
import {
  ReferencesController,
  AdminReferencesController,
} from './references.controller';

/**
 * 문헌 자료실.
 *
 * 커뮤니티에 볼 것이 없다는 문제를 게시글을 지어내서 풀지 않는다. 출처가 있는
 * 실물 문헌을 모아 검색되게 하고, 게시판에는 그중 값어치 있는 것만 사람이 골라
 * 소개한다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Reference])],
  controllers: [ReferencesController, AdminReferencesController],
  providers: [ReferencesService, ReferenceIngestService],
  exports: [ReferencesService, ReferenceIngestService],
})
export class ReferencesModule {}
