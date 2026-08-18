import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { UnitStatus } from '@prisma/client';

export class CreateUnitDto {
  @IsInt()
  @IsNotEmpty()
  unitNo: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  floor: string;

  @IsEnum(UnitStatus)
  @IsNotEmpty()
  status: UnitStatus;
}
