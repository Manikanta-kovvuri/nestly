import { IsDateString, IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CreateLeaseDto {
  @IsInt()
  @IsNotEmpty()
  tenantId: number;

  @IsInt()
  @IsNotEmpty()
  unitId: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  rentAmount: number;
}
