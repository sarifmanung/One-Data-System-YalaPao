import { IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PaperResultDto {
  @IsIn(['PAPER_APPROVED', 'PAPER_REJECTED'])
  result!: 'PAPER_APPROVED' | 'PAPER_REJECTED';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  approvedDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string;

  @IsOptional()
  @IsDateString()
  documentDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4_000)
  reason?: string;
}
