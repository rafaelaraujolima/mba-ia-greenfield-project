import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { Channel } from '../channels/entities/channel.entity';
import { Comment } from '../comments/entities/comment.entity';
import { createTestDataSource } from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { Video } from '../videos/entities/video.entity';
import { CommentReaction } from './entities/comment-reaction.entity';
import { VideoReaction } from './entities/video-reaction.entity';
import { ReactionsModule } from './reactions.module';
import { ReactionsService } from './reactions.service';

const ALL_ENTITIES = [
  User,
  Channel,
  Category,
  Video,
  Comment,
  VideoReaction,
  CommentReaction,
];

describe('ReactionsModule', () => {
  it('should compile and expose ReactionsService', async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(createTestDataSource(ALL_ENTITIES).options),
        ReactionsModule,
      ],
    }).compile();

    expect(module.get(ReactionsService)).toBeInstanceOf(ReactionsService);
    await module.close();
  }, 30000);
});
