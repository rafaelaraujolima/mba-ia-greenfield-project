import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_FOLLOWED_CHANNELS_LIMIT } from '../subscriptions.constants';

export class ListSubscriptionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_FOLLOWED_CHANNELS_LIMIT)
  limit?: number;
}
