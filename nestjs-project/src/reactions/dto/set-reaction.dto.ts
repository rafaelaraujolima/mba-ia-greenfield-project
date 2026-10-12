import { IsEnum } from 'class-validator';
import { ReactionType } from '../entities/reaction-type.enum';

export class SetReactionDto {
  /** Reaction to record: `like` or `dislike`. */
  @IsEnum(ReactionType)
  type: ReactionType;
}
