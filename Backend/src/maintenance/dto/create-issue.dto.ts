import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIssueDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;
}
