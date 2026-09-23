import { QueryFailedError } from 'typeorm';
import {
  ChannelNotFoundException,
  ChannelNotOwnedException,
  NicknameAlreadyExistsException,
} from '../common/exceptions/domain.exception';
import { ChannelsService } from './channels.service';
import { Channel } from './entities/channel.entity';

function makeManager(overrides: Record<string, jest.Mock> = {}): any {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    ...overrides,
  };
}

function makeChannel(nickname: string): Channel {
  const c = new Channel();
  c.id = 'uuid';
  c.nickname = nickname;
  c.name = nickname;
  c.user_id = 'user-id';
  c.description = null;
  c.created_at = new Date();
  c.updated_at = new Date();
  return c;
}

function makeUniqueError(): QueryFailedError {
  const err = new QueryFailedError('INSERT', [], new Error()) as any;
  err.code = '23505';
  err.detail = 'Key (nickname)=(abc) already exists.';
  return err;
}

function makeDataSource(manager: any): any {
  return {
    transaction: jest.fn((cb: (manager: any) => Promise<any>) => cb(manager)),
  };
}

function makeChannelRepository(): any {
  return { findOneBy: jest.fn() };
}

describe('ChannelsService', () => {
  describe('findById', () => {
    it('returns the channel when found', async () => {
      const channel = makeChannel('test');
      const channelRepository = makeChannelRepository();
      channelRepository.findOneBy.mockResolvedValue(channel);
      const service = new ChannelsService(
        makeDataSource(makeManager()),
        channelRepository,
      );

      const result = await service.findById('uuid');

      expect(channelRepository.findOneBy).toHaveBeenCalledWith({
        id: 'uuid',
      });
      expect(result).toBe(channel);
    });

    it('returns null when not found', async () => {
      const channelRepository = makeChannelRepository();
      channelRepository.findOneBy.mockResolvedValue(null);
      const service = new ChannelsService(
        makeDataSource(makeManager()),
        channelRepository,
      );

      const result = await service.findById('missing');

      expect(result).toBeNull();
    });
  });

  describe('createChannel', () => {
    it('derives nickname from email prefix and saves when no collision', async () => {
      const channel = makeChannel('test');
      const manager = makeManager({
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue(channel),
        save: jest.fn().mockResolvedValue(channel),
      });
      const service = new ChannelsService(
        makeDataSource(manager),
        makeChannelRepository(),
      );

      const result = await service.createChannel('user-id', 'test@example.com');

      expect(manager.findOne).toHaveBeenCalledWith(Channel, {
        where: { nickname: 'test' },
      });
      expect(manager.save).toHaveBeenCalledTimes(1);
      expect(result.nickname).toBe('test');
    });

    it('retries with suffix when pre-check finds existing nickname', async () => {
      const colliding = makeChannel('john');
      const resolved = makeChannel('john_abc');
      const manager = makeManager({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(colliding)
          .mockResolvedValueOnce(null),
        create: jest.fn().mockReturnValue(resolved),
        save: jest.fn().mockResolvedValue(resolved),
      });
      const service = new ChannelsService(
        makeDataSource(manager),
        makeChannelRepository(),
      );

      const result = await service.createChannel('user-id', 'john@example.com');

      expect(manager.findOne).toHaveBeenCalledTimes(2);
      expect(manager.save).toHaveBeenCalledTimes(1);
      expect(result.nickname).toMatch(/^john_[a-z0-9]{3}$/);
    });

    it('retries with suffix on concurrent unique constraint violation', async () => {
      const resolved = makeChannel('alice_abc');
      const manager = makeManager({
        findOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: jest.fn().mockReturnValue(resolved),
        save: jest
          .fn()
          .mockRejectedValueOnce(makeUniqueError())
          .mockResolvedValueOnce(resolved),
      });
      const service = new ChannelsService(
        makeDataSource(manager),
        makeChannelRepository(),
      );

      const result = await service.createChannel(
        'user-id',
        'alice@example.com',
      );

      expect(manager.save).toHaveBeenCalledTimes(2);
      expect(result.nickname).toMatch(/^alice/);
    });

    it('throws after exhausting max retries', async () => {
      const existing = makeChannel('bob');
      const manager = makeManager({
        findOne: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
        save: jest.fn(),
      });
      const service = new ChannelsService(
        makeDataSource(manager),
        makeChannelRepository(),
      );

      await expect(
        service.createChannel('user-id', 'bob@example.com'),
      ).rejects.toThrow(
        'Nickname conflict could not be resolved after max retries',
      );
    });

    it('re-throws non-unique-constraint errors immediately', async () => {
      const unexpectedError = new Error('Connection lost');
      const channel = makeChannel('carol');
      const manager = makeManager({
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue(channel),
        save: jest.fn().mockRejectedValue(unexpectedError),
      });
      const service = new ChannelsService(
        makeDataSource(manager),
        makeChannelRepository(),
      );

      await expect(
        service.createChannel('user-id', 'carol@example.com'),
      ).rejects.toThrow('Connection lost');
      expect(manager.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateChannel', () => {
    function makeUpdateRepository(overrides: Record<string, jest.Mock> = {}) {
      return {
        findOneBy: jest.fn(),
        save: jest.fn((data) => Promise.resolve(data)),
        ...overrides,
      } as any;
    }

    function makeService(repository: any) {
      return new ChannelsService(makeDataSource(makeManager()), repository);
    }

    it('throws ChannelNotFoundException when the channel does not exist', async () => {
      const repository = makeUpdateRepository({
        findOneBy: jest.fn().mockResolvedValue(null),
      });

      await expect(
        makeService(repository).updateChannel('uuid', 'user-id', {}),
      ).rejects.toThrow(ChannelNotFoundException);
    });

    it('throws ChannelNotOwnedException when the channel belongs to another user', async () => {
      const repository = makeUpdateRepository({
        findOneBy: jest.fn().mockResolvedValue(makeChannel('mine')),
      });

      await expect(
        makeService(repository).updateChannel('uuid', 'other-user', {}),
      ).rejects.toThrow(ChannelNotOwnedException);
    });

    it('throws NicknameAlreadyExistsException without suffixing when the nickname is taken', async () => {
      const repository = makeUpdateRepository({
        findOneBy: jest
          .fn()
          .mockResolvedValueOnce(makeChannel('mine'))
          .mockResolvedValueOnce(makeChannel('taken')),
      });

      await expect(
        makeService(repository).updateChannel('uuid', 'user-id', {
          nickname: 'taken',
        }),
      ).rejects.toThrow(NicknameAlreadyExistsException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('maps a unique violation on nickname (race) to NicknameAlreadyExistsException', async () => {
      const repository = makeUpdateRepository({
        findOneBy: jest
          .fn()
          .mockResolvedValueOnce(makeChannel('mine'))
          .mockResolvedValueOnce(null),
        save: jest.fn().mockRejectedValue(makeUniqueError()),
      });

      await expect(
        makeService(repository).updateChannel('uuid', 'user-id', {
          nickname: 'racy',
        }),
      ).rejects.toThrow(NicknameAlreadyExistsException);
    });

    it('updates only the provided fields', async () => {
      const repository = makeUpdateRepository({
        findOneBy: jest
          .fn()
          .mockResolvedValueOnce(makeChannel('mine'))
          .mockResolvedValueOnce(null),
      });

      const result = await makeService(repository).updateChannel(
        'uuid',
        'user-id',
        { nickname: 'fresh', description: 'New description' },
      );

      expect(result.nickname).toBe('fresh');
      expect(result.description).toBe('New description');
      expect(result.name).toBe('mine');
    });

    it('does not check for collision when the nickname is unchanged', async () => {
      const findOneBy = jest.fn().mockResolvedValue(makeChannel('mine'));
      const repository = makeUpdateRepository({ findOneBy });

      await makeService(repository).updateChannel('uuid', 'user-id', {
        nickname: 'mine',
        name: 'Renamed',
      });

      expect(findOneBy).toHaveBeenCalledTimes(1);
    });
  });
});
