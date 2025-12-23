import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { Post } from '../../database/entities/post.entity';
import { Comment } from '../../database/entities/comment.entity';
import { Category } from '../../database/entities/category.entity';
import { Tag } from '../../database/entities/tag.entity';
import { Attachment } from '../../database/entities/attachment.entity';
import { Bookmark } from '../../database/entities/bookmark.entity';
import { PostLike } from '../../database/entities/post-like.entity';
import { Report } from '../../database/entities/report.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      Comment,
      Category,
      Tag,
      Attachment,
      Bookmark,
      PostLike,
      Report,
      User,
    ]),
  ],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
