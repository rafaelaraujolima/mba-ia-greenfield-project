import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MAX_COMMENTS_LIMIT } from '../comments.constants';

export class ListCommentsDto {
  /** Opaque cursor returned as `nextCursor` by the previous page; omit for the first page. */
  @IsOptional()
  @IsString()
  cursor?: string;

  /** Items per page. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_COMMENTS_LIMIT)
  limit?: number;
}
