import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { Channel } from '../channels/entities/channel.entity';
import { createTestDataSource } from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { Video } from '../videos/entities/video.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionsModule } from './subscriptions.module';
import { SubscriptionsService } from './subscriptions.service';

const ALL_ENTITIES = [User, Channel, Category, Video, Subscription];

describe('SubscriptionsModule', () => {
  it('should compile and expose SubscriptionsService', async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(createTestDataSource(ALL_ENTITIES).options),
        SubscriptionsModule,
      ],
    }).compile();

    expect(module.get(SubscriptionsService)).toBeInstanceOf(
      SubscriptionsService,
    );
    await module.close();
  }, 30000);
});
