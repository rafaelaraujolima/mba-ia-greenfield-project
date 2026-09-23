import { DataSource, Repository } from 'typeorm';
import {
  cleanAllTables,
  createTestDataSource,
} from '../test/create-test-data-source';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

describe('CategoriesService (integration)', () => {
  let dataSource: DataSource;
  let categoriesService: CategoriesService;
  let categoryRepository: Repository<Category>;

  beforeAll(async () => {
    dataSource = createTestDataSource([Category]);
    await dataSource.initialize();
    categoryRepository = dataSource.getRepository(Category);
    categoriesService = new CategoriesService(categoryRepository);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);
  });

  describe('findAll', () => {
    it('returns an empty array when no categories exist', async () => {
      const result = await categoriesService.findAll();

      expect(result).toEqual([]);
    });

    it('returns every category, ordered by name', async () => {
      await categoryRepository.save(
        categoryRepository.create({ name: 'Music' }),
      );
      await categoryRepository.save(
        categoryRepository.create({ name: 'Education' }),
      );
      await categoryRepository.save(
        categoryRepository.create({ name: 'Gaming' }),
      );

      const result = await categoriesService.findAll();

      expect(result.map((c) => c.name)).toEqual([
        'Education',
        'Gaming',
        'Music',
      ]);
    });
  });
});
