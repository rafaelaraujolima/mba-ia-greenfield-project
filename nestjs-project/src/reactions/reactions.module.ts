import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from '../comments/entities/comment.entity';
import { Video } from '../videos/entities/video.entity';
import { CommentReaction } from './entities/comment-reaction.entity';
import { VideoReaction } from './entities/video-reaction.entity';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoReaction, CommentReaction, Video, Comment]),
  ],
  controllers: [ReactionsController],
  providers: [ReactionsService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
