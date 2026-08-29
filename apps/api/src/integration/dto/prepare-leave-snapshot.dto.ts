import { IsISO8601, IsOptional, IsString, Matches } from 'class-validator';

export class PrepareLeaveSnapshotDto {
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period!: string;

  @IsOptional()
  @IsISO8601()
  sourceCutoff?: string;
}
