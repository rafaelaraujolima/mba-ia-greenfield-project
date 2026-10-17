import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CompletedPartDto {
  @IsInt()
  @Min(1)
  @Max(10000)
  partNumber: number;

  @IsString()
  @MinLength(1)
  eTag: string;
}
