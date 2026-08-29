import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDelegatedApproverDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  externalSubject!: string;

  @IsIn(['leave.paper-decision.record', 'leave.request.void'])
  capability!: 'leave.paper-decision.record' | 'leave.request.void';

  @IsIn(['tenant', 'affiliation'])
  workspaceKind!: 'tenant' | 'affiliation';

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  workspaceId!: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4_000)
  reason?: string;
}
