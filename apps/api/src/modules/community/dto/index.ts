import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostType } from '../../../database/entities/post.entity';

// Post DTOs
export class CreatePostDto {
  @ApiProperty({ description: '게시글 제목', minLength: 2, maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: '게시글 내용', minLength: 10 })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiProperty({ description: '게시글 유형', enum: PostType })
  @IsEnum(PostType)
  type: PostType;

  @ApiPropertyOptional({ description: '카테고리 ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: '연결된 치험례 ID' })
  @IsOptional()
  @IsUUID()
  linkedCaseId?: string;

  @ApiPropertyOptional({ description: '익명 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ description: '태그 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '첨부파일 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}

export class UpdatePostDto {
  @ApiPropertyOptional({ description: '게시글 제목' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: '게시글 내용' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;

  @ApiPropertyOptional({ description: '카테고리 ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: '태그 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// Comment DTOs
export class CreateCommentDto {
  @ApiProperty({ description: '댓글 내용', minLength: 1 })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ description: '익명 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ description: '부모 댓글 ID (대댓글)' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateCommentDto {
  @ApiProperty({ description: '댓글 내용' })
  @IsString()
  @MinLength(1)
  content: string;
}

// Report DTO
export class CreateReportDto {
  @ApiProperty({ description: '신고 사유' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: '상세 설명' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

// Query DTOs
export class PostQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: '게시글 유형', enum: PostType })
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @ApiPropertyOptional({ description: '카테고리 슬러그' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '정렬 방식', enum: ['latest', 'popular', 'views', 'comments'] })
  @IsOptional()
  sortBy?: 'latest' | 'popular' | 'views' | 'comments';

  @ApiPropertyOptional({ description: '검색 키워드' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '태그 필터' })
  @IsOptional()
  @IsString()
  tag?: string;

  /**
   * 이 태그가 붙은 글을 뺀다.
   *
   * 임상정보 게시판 하나에 문헌 소개 3,307편과 운영팀이 쓴 제도 해설 8편이
   * 같이 있다. 최신순으로 놓으면 해설 8편은 첫 화면에서 사라진다 — 가장
   * 공들인 글이 가장 안 보이는 셈이다.
   *
   * 화면에서 "문헌만 / 해설만" 을 가르려면 "임상정보이면서 문헌이 아닌 것"
   * 을 물을 수 있어야 한다. tag 하나로는 그 질문이 안 된다.
   */
  @ApiPropertyOptional({ description: '제외할 태그' })
  @IsOptional()
  @IsString()
  excludeTag?: string;

  @ApiPropertyOptional({ description: '작성자 ID 필터 (내 글 보기)' })
  @IsOptional()
  @IsUUID()
  authorId?: string;
}
