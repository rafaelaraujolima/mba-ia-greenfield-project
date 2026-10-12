import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { COMMENT_BODY_MAX_LENGTH } from '../comments.constants';

export class CreateCommentDto {
  /** Plain text comment body (no formatting); surrounding whitespace is trimmed. */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMMENT_BODY_MAX_LENGTH)
  body: string;

  /** Id of the top-level comment this one replies to (max depth 2). */
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
