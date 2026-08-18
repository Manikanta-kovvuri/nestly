import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { UnitStatus } from '@prisma/client';

export class UpdateUnitDto {
  @IsInt()
  @IsOptional()
  unitNo?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  floor?: string;

  @IsEnum(UnitStatus)
  @IsOptional()
  status?: UnitStatus;
}
