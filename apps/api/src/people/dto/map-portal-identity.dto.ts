import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class MapPortalIdentityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  externalSubject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  employeeId!: string;
}
