import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createTestDataSource } from '../test/create-test-data-source';
import { Category } from './entities/category.entity';
import { CategoriesModule } from './categories.module';

describe('CategoriesModule', () => {
  it('should compile with TypeOrmModule.forFeature([Category])', async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(createTestDataSource([Category]).options),
        CategoriesModule,
      ],
    }).compile();

    expect(module).toBeDefined();
    await module.close();
  }, 30000);
});
