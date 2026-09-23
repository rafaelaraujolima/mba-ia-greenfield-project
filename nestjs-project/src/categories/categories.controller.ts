import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List categories',
    description: 'Returns every video category available on the platform.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories list',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
        },
      },
    },
  })
  async findAll(): Promise<{ id: string; name: string }[]> {
    const categories = await this.categoriesService.findAll();
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
    }));
  }
}
