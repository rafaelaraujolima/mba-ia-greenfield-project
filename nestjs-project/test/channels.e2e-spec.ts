import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { Channel } from '../src/channels/entities/channel.entity';
import { DomainExceptionFilter } from '../src/common/filters/domain-exception.filter';
import { ValidationExceptionFilter } from '../src/common/filters/validation-exception.filter';
import { cleanAllTables } from '../src/test/create-test-data-source';
import { User } from '../src/users/entities/user.entity';
import {
  Video,
  VideoStatus,
  VideoVisibility,
} from '../src/videos/entities/video.entity';

describe('Channels (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let channelRepository: Repository<Channel>;
  let videoRepository: Repository<Video>;
  let throttlerStorage: ThrottlerStorageService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(
      new DomainExceptionFilter(),
      new ValidationExceptionFilter(),
    );
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    userRepository = dataSource.getRepository(User);
    channelRepository = dataSource.getRepository(Channel);
    videoRepository = dataSource.getRepository(Video);
    throttlerStorage =
      moduleFixture.get<ThrottlerStorageService>(ThrottlerStorage);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
    throttlerStorage.storage.clear();
  });

  let authCounter = 0;
  async function registerConfirmAndLogin(): Promise<{
    accessToken: string;
    channelId: string;
  }> {
    const email = `channels_auth_e2e_${++authCounter}@example.com`;
    const password = 'password123';
    const authService = app.get(AuthService);
    const mailServiceInstance = (authService as any).mailService;
    let capturedToken = '';
    jest
      .spyOn(mailServiceInstance, 'sendConfirmationEmail')
      .mockImplementationOnce(async (_e: string, _n: string, t: string) => {
        capturedToken = t;
      });

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password });
    await request(app.getHttpServer())
      .get('/auth/confirm-email')
      .query({ token: capturedToken });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password });

    const channel = await channelRepository.findOneByOrFail({
      user_id: registerRes.body.id,
    });

    return { accessToken: loginRes.body.access_token, channelId: channel.id };
  }

  let counter = 0;
  async function createChannel(nickname: string): Promise<Channel> {
    const user = await userRepository.save(
      userRepository.create({
        email: `channels_e2e_${++counter}@example.com`,
        password: 'hashed',
      }),
    );
    return channelRepository.save(
      channelRepository.create({
        name: `Channel ${counter}`,
        nickname,
        description: 'A channel',
        user_id: user.id,
      }),
    );
  }

  describe('PATCH /channels/:id', () => {
    it('returns 200 with the updated nickname for the owner', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .patch(`/channels/${channelId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nickname: 'brand_new', name: 'Brand New' })
        .expect(200);

      expect(res.body.nickname).toBe('brand_new');
      expect(res.body.name).toBe('Brand New');
    });

    it('returns 409 with NICKNAME_ALREADY_EXISTS when the nickname belongs to another channel', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();
      await createChannel('taken_nick');

      const res = await request(app.getHttpServer())
        .patch(`/channels/${channelId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nickname: 'taken_nick' })
        .expect(409);

      expect(res.body.error).toBe('NICKNAME_ALREADY_EXISTS');
    });

    it('returns 403 with CHANNEL_NOT_OWNED for another user channel', async () => {
      const { channelId } = await registerConfirmAndLogin();
      const other = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .patch(`/channels/${channelId}`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send({ name: 'Hijacked' })
        .expect(403);

      expect(res.body.error).toBe('CHANNEL_NOT_OWNED');
    });

    it('returns 400 for an invalid nickname format', async () => {
      const { accessToken, channelId } = await registerConfirmAndLogin();

      await request(app.getHttpServer())
        .patch(`/channels/${channelId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nickname: 'Not Valid!' })
        .expect(400);
    });

    it('returns 401 without a bearer token', async () => {
      const { channelId } = await registerConfirmAndLogin();

      await request(app.getHttpServer())
        .patch(`/channels/${channelId}`)
        .send({ name: 'x' })
        .expect(401);
    });
  });

  describe('GET /channels/:nickname', () => {
    it('returns 200 with public channel information, without authentication', async () => {
      const channel = await createChannel('publicnick');

      const res = await request(app.getHttpServer())
        .get('/channels/publicnick')
        .expect(200);

      expect(res.body).toEqual({
        id: channel.id,
        name: channel.name,
        nickname: 'publicnick',
        description: 'A channel',
      });
    });

    it('returns 404 with CHANNEL_NOT_FOUND for an unknown nickname', async () => {
      const res = await request(app.getHttpServer())
        .get('/channels/unknown-nick')
        .expect(404);

      expect(res.body.error).toBe('CHANNEL_NOT_FOUND');
    });
  });

  describe('GET /channels/:nickname/videos', () => {
    function saveVideo(channelId: string, overrides: Partial<Video>) {
      return videoRepository.save(
        videoRepository.create({
          channel_id: channelId,
          title: 'Video',
          storage_key: `videos/${channelId}/x.mp4`,
          ...overrides,
        }),
      );
    }

    it('returns only ready, public and published videos, without authentication', async () => {
      const channel = await createChannel('videosnick');
      const visible = await saveVideo(channel.id, {
        title: 'Visible',
        status: VideoStatus.READY,
        published_at: new Date(),
      });
      await saveVideo(channel.id, {
        title: 'Draft',
        status: VideoStatus.READY,
        published_at: null,
      });
      await saveVideo(channel.id, {
        title: 'Unlisted',
        status: VideoStatus.READY,
        visibility: VideoVisibility.UNLISTED,
        published_at: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get('/channels/videosnick/videos')
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(visible.id);
    });

    it('returns 404 with CHANNEL_NOT_FOUND for an unknown nickname', async () => {
      const res = await request(app.getHttpServer())
        .get('/channels/unknown-nick/videos')
        .expect(404);

      expect(res.body.error).toBe('CHANNEL_NOT_FOUND');
    });

    it('returns 400 when pageSize is out of range', async () => {
      await createChannel('pagenick');

      await request(app.getHttpServer())
        .get('/channels/pagenick/videos')
        .query({ pageSize: 0 })
        .expect(400);
    });
  });
});
