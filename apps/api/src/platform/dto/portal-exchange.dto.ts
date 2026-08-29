import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PortalExchangeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8_192)
  token!: string;
}
