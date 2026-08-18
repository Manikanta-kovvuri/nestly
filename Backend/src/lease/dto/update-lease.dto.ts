import { IsDateString, IsInt, IsOptional, IsPositive } from 'class-validator';

export class UpdateLeaseDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  rentAmount?: number;
}
