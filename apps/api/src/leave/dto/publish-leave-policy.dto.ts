import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PublishLeavePolicyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  approvalReference!: string;
}
