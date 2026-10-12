import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { Channel } from '../src/channels/entities/channel.entity';
import { DomainExceptionFilter } from '../src/common/filters/domain-exception.filter';
import { ValidationExceptionFilter } from '../src/common/filters/validation-exception.filter';
import { Subscription } from '../src/subscriptions/entities/subscription.entity';
import { cleanAllTables } from '../src/test/create-test-data-source';

interface TestUser {
  accessToken: string;
  userId: string;
  channelId: string;
  nickname: string;
}

describe('Subscriptions — subscribe/unsubscribe (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let channelRepository: Repository<Channel>;
  let subscriptionRepository: Repository<Subscription>;
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
    channelRepository = dataSource.getRepository(Channel);
    subscriptionRepository = dataSource.getRepository(Subscription);
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
  async function registerConfirmAndLogin(): Promise<TestUser> {
    const email = `subscribe_e2e_${++authCounter}@example.com`;
    const password = 'password123';
    const authService = app.get(AuthService);
    const { mailService } = authService as unknown as {
      mailService: {
        sendConfirmationEmail: (
          email: string,
          name: string,
          token: string,
        ) => Promise<void>;
      };
    };
    let capturedToken = '';
    jest
      .spyOn(mailService, 'sendConfirmationEmail')
      .mockImplementationOnce((_e: string, _n: string, t: string) => {
        capturedToken = t;
        return Promise.resolve();
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

    const { id: userId } = registerRes.body as { id: string };
    const { access_token: accessToken } = loginRes.body as {
      access_token: string;
    };
    const channel = await channelRepository.findOneByOrFail({
      user_id: userId,
    });

    return {
      accessToken,
      userId,
      channelId: channel.id,
      nickname: channel.nickname,
    };
  }

  describe('PUT /channels/:nickname/subscription', () => {
    it('should create the subscription and answer 204', async () => {
      const viewer = await registerConfirmAndLogin();
      const owner = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .put(`/channels/${owner.nickname}/subscription`)
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(res.status).toBe(204);
      expect(
        await subscriptionRepository.countBy({
          user_id: viewer.userId,
          channel_id: owner.channelId,
        }),
      ).toBe(1);
    });

    it('should be idempotent: repeating keeps a single row', async () => {
      const viewer = await registerConfirmAndLogin();
      const owner = await registerConfirmAndLogin();
      const url = `/channels/${owner.nickname}/subscription`;

      const first = await request(app.getHttpServer())
        .put(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`);
      const second = await request(app.getHttpServer())
        .put(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(first.status).toBe(204);
      expect(second.status).toBe(204);
      expect(
        await subscriptionRepository.countBy({ user_id: viewer.userId }),
      ).toBe(1);
    });

    it('should forbid subscribing to the own channel', async () => {
      const owner = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .put(`/channels/${owner.nickname}/subscription`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(403);
      expect((res.body as { error: string }).error).toBe(
        'CANNOT_SUBSCRIBE_OWN_CHANNEL',
      );
      expect(await subscriptionRepository.count()).toBe(0);
    });

    it('should answer 404 CHANNEL_NOT_FOUND for an unknown nickname', async () => {
      const viewer = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .put('/channels/nao-existe/subscription')
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(res.status).toBe(404);
      expect((res.body as { error: string }).error).toBe('CHANNEL_NOT_FOUND');
    });

    it('should answer 401 without a token', async () => {
      const owner = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer()).put(
        `/channels/${owner.nickname}/subscription`,
      );

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /channels/:nickname/subscription', () => {
    it('should remove the subscription and stay idempotent', async () => {
      const viewer = await registerConfirmAndLogin();
      const owner = await registerConfirmAndLogin();
      const url = `/channels/${owner.nickname}/subscription`;
      await request(app.getHttpServer())
        .put(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      const first = await request(app.getHttpServer())
        .delete(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`);
      const second = await request(app.getHttpServer())
        .delete(url)
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(first.status).toBe(204);
      expect(second.status).toBe(204);
      expect(await subscriptionRepository.count()).toBe(0);
    });

    it('should answer 404 CHANNEL_NOT_FOUND for an unknown nickname', async () => {
      const viewer = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer())
        .delete('/channels/nao-existe/subscription')
        .set('Authorization', `Bearer ${viewer.accessToken}`);

      expect(res.status).toBe(404);
      expect((res.body as { error: string }).error).toBe('CHANNEL_NOT_FOUND');
    });

    it('should answer 401 without a token', async () => {
      const owner = await registerConfirmAndLogin();

      const res = await request(app.getHttpServer()).delete(
        `/channels/${owner.nickname}/subscription`,
      );

      expect(res.status).toBe(401);
    });
  });
});
