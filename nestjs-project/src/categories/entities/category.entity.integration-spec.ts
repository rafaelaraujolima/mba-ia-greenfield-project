import { DataSource, Repository } from 'typeorm';
import {
  cleanAllTables,
  createTestDataSource,
} from '../../test/create-test-data-source';
import { Category } from './category.entity';

describe('Category entity (integration)', () => {
  let dataSource: DataSource;
  let categoryRepository: Repository<Category>;

  beforeAll(async () => {
    dataSource = createTestDataSource([Category]);
    await dataSource.initialize();
    categoryRepository = dataSource.getRepository(Category);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  it('should persist a category with a generated id and created_at', async () => {
    const category = await categoryRepository.save(
      categoryRepository.create({ name: 'Music' }),
    );

    expect(category.id).toBeDefined();
    expect(category.created_at).toBeInstanceOf(Date);
  });

  it('should reject two categories with the same name', async () => {
    await categoryRepository.save(
      categoryRepository.create({ name: 'Gaming' }),
    );

    await expect(
      categoryRepository.save(categoryRepository.create({ name: 'Gaming' })),
    ).rejects.toThrow();
  });
});
