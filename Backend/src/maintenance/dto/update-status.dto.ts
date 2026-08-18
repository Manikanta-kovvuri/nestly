import { IsEnum, IsNotEmpty } from 'class-validator';
import { MaintenanceStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(MaintenanceStatus)
  @IsNotEmpty()
  status: MaintenanceStatus;
}
