import { IsInt, IsNotEmpty, IsString, Matches, Max, Min } from 'class-validator';

export class UpsertLeaveSnapshotScheduleDto {
  @IsString()
  @IsNotEmpty()
  affiliationId!: string;

  @IsInt()
  @Min(0)
  @Max(31)
  cutoffDays!: number;

  @IsString()
  @Matches(/^1\.(0|1)$/)
  contractVersion!: string;
}
