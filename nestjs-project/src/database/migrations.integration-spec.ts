import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Channel } from '../channels/entities/channel.entity';
import { Category } from '../categories/entities/category.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { VerificationToken } from '../auth/entities/verification-token.entity';
import { Video } from '../videos/entities/video.entity';
import { CreateUsersAndChannels1775687773260 } from './migrations/1775687773260-CreateUsersAndChannels';
import { CreateAuthTokens1777579850478 } from './migrations/1777579850478-CreateAuthTokens';
import { CreateVideos1789992735808 } from './migrations/1789992735808-CreateVideos';
import { CreateCategories1790121813965 } from './migrations/1790121813965-CreateCategories';
import { AddVideoEditingColumns1790122198040 } from './migrations/1790122198040-AddVideoEditingColumns';
import { createTestDataSource } from '../test/create-test-data-source';

const MANAGED_TABLES = [
  'users',
  'channels',
  'refresh_tokens',
  'verification_tokens',
  'videos',
  'categories',
];

describe('Database migrations (integration)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = createTestDataSource(
      [User, Channel, RefreshToken, VerificationToken, Category, Video],
      {
        synchronize: false,
        migrations: [
          CreateUsersAndChannels1775687773260,
          CreateAuthTokens1777579850478,
          CreateVideos1789992735808,
          CreateCategories1790121813965,
          AddVideoEditingColumns1790122198040,
        ],
      },
    );

    await dataSource.initialize();

    // Sequential, not Promise.all: concurrent DROP TABLE ... CASCADE across
    // FK-linked tables (users <- channels <- videos) can deadlock in Postgres.
    for (const table of [...MANAGED_TABLES, 'migrations']) {
      await dataSource.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
    // DROP TABLE does not drop enum types it depended on — drop them
    // explicitly so re-running the migrations (CREATE TYPE, no IF NOT
    // EXISTS) is idempotent regardless of what other suites already
    // synchronized against the shared test DB.
    await dataSource.query(
      `DROP TYPE IF EXISTS "public"."verification_tokens_type_enum"`,
    );
    await dataSource.query(`DROP TYPE IF EXISTS "public"."videos_status_enum"`);
    await dataSource.query(
      `DROP TYPE IF EXISTS "public"."videos_visibility_enum"`,
    );
  });

  afterAll(async () => {
    // The second test undoes the last migration, leaving the video editing
    // columns missing. Re-apply so the shared DB is fully migrated when
    // subsequent suites run.
    await dataSource.runMigrations();
    await dataSource.destroy();
  });

  it('should apply all migrations and create all six tables', async () => {
    const ranMigrations = await dataSource.runMigrations();

    expect(ranMigrations).toHaveLength(5);

    const result = await dataSource.query<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [MANAGED_TABLES],
    );
    const tableNames = result.map((r) => r.table_name);
    expect(tableNames).toEqual([
      'categories',
      'channels',
      'refresh_tokens',
      'users',
      'verification_tokens',
      'videos',
    ]);
  });

  it('should revert the last migration and remove the video editing columns', async () => {
    await dataSource.undoLastMigration();

    const result = await dataSource.query<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'videos'
         AND column_name = ANY($1::text[])`,
      [['description', 'category_id', 'visibility', 'published_at']],
    );
    expect(result).toHaveLength(0);
  });
});
