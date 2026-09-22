import { ArrayNotEmpty, IsArray, IsInt, Max, Min } from 'class-validator';

export class RequestUploadPartsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(10000, { each: true })
  partNumbers: number[];
}
