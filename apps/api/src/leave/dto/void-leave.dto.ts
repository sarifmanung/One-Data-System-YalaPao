import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VoidLeaveDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4_000)
  reason!: string;
}
