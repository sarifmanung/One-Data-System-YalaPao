import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateLeavePolicyRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  leaveTypeId!: string;

  @IsIn(['WORKING_DAYS', 'CALENDAR_DAYS'])
  countingMode!: 'WORKING_DAYS' | 'CALENDAR_DAYS';

  @IsBoolean()
  halfDayAllowed!: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(3660)
  entitlementDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  entitlementPeriod?: string;

  @IsBoolean()
  carryOverAllowed!: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(3660)
  maxCarryOverDays?: number;

  @IsBoolean()
  requiresSupportingDocument!: boolean;
}

export class CreateLeavePolicyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  employeeTypeScope!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalBasis?: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  affiliationId!: string;

  @ValidateNested({ each: true })
  @Type(() => CreateLeavePolicyRuleDto)
  @ArrayMinSize(1)
  rules!: CreateLeavePolicyRuleDto[];
}
