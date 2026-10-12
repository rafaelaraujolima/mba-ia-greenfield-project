import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Channel } from '../channels/entities/channel.entity';
import {
  CannotSubscribeOwnChannelException,
  ChannelNotFoundException,
} from '../common/exceptions/domain.exception';
import { Video } from '../videos/entities/video.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  const insertBuilder = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  };
  const subscriptionRepository = {
    createQueryBuilder: jest.fn(() => insertBuilder),
    delete: jest.fn(),
    find: jest.fn(),
  };
  const channelRepository = { findOneBy: jest.fn() };
  const videoRepository = { createQueryBuilder: jest.fn() };

  const channel = {
    id: 'channel-1',
    nickname: 'owner-channel',
    user_id: 'owner-1',
  } as Channel;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: subscriptionRepository,
        },
        { provide: getRepositoryToken(Channel), useValue: channelRepository },
        { provide: getRepositoryToken(Video), useValue: videoRepository },
      ],
    }).compile();
    service = module.get(SubscriptionsService);
  });

  describe('subscribe', () => {
    it('should throw ChannelNotFoundException when the nickname is unknown', async () => {
      channelRepository.findOneBy.mockResolvedValue(null);

      await expect(service.subscribe('viewer-1', 'nobody')).rejects.toThrow(
        ChannelNotFoundException,
      );
      expect(insertBuilder.execute).not.toHaveBeenCalled();
    });

    it('should reject subscribing to the user own channel without writing', async () => {
      channelRepository.findOneBy.mockResolvedValue(channel);

      await expect(
        service.subscribe('owner-1', channel.nickname),
      ).rejects.toThrow(CannotSubscribeOwnChannelException);
      expect(insertBuilder.execute).not.toHaveBeenCalled();
    });

    it('should insert ignoring conflicts so repeated calls are idempotent', async () => {
      channelRepository.findOneBy.mockResolvedValue(channel);

      await service.subscribe('viewer-1', channel.nickname);

      expect(insertBuilder.values).toHaveBeenCalledWith({
        user_id: 'viewer-1',
        channel_id: 'channel-1',
      });
      expect(insertBuilder.orIgnore).toHaveBeenCalled();
      expect(insertBuilder.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe', () => {
    it('should throw ChannelNotFoundException when the nickname is unknown', async () => {
      channelRepository.findOneBy.mockResolvedValue(null);

      await expect(service.unsubscribe('viewer-1', 'nobody')).rejects.toThrow(
        ChannelNotFoundException,
      );
      expect(subscriptionRepository.delete).not.toHaveBeenCalled();
    });

    it('should delete by (user, channel) without failing when nothing exists', async () => {
      channelRepository.findOneBy.mockResolvedValue(channel);
      subscriptionRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(
        service.unsubscribe('viewer-1', channel.nickname),
      ).resolves.toBeUndefined();
      expect(subscriptionRepository.delete).toHaveBeenCalledWith({
        user_id: 'viewer-1',
        channel_id: 'channel-1',
      });
    });
  });

  describe('batch lookups', () => {
    it('should return an empty map without querying when no channel ids are given', async () => {
      const counts = await service.countByChannelIds([]);

      expect(counts.size).toBe(0);
      expect(subscriptionRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return an empty set without querying when no channel ids are given', async () => {
      const subscribed = await service.findSubscribedChannelIds('viewer-1', []);

      expect(subscribed.size).toBe(0);
      expect(subscriptionRepository.find).not.toHaveBeenCalled();
    });
  });
});
