import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { Channel } from '../channels/entities/channel.entity';
import { CommentReaction } from '../reactions/entities/comment-reaction.entity';
import { VideoReaction } from '../reactions/entities/video-reaction.entity';
import { createTestDataSource } from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { Video } from '../videos/entities/video.entity';
import { CommentsModule } from './comments.module';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';

const ALL_ENTITIES = [
  User,
  Channel,
  Category,
  Video,
  Comment,
  VideoReaction,
  CommentReaction,
];

describe('CommentsModule', () => {
  it('should compile and expose CommentsService', async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(createTestDataSource(ALL_ENTITIES).options),
        CommentsModule,
      ],
    }).compile();

    expect(module.get(CommentsService)).toBeInstanceOf(CommentsService);
    await module.close();
  }, 30000);
});
