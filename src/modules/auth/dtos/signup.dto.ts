import { IsString, MinLength } from 'class-validator';
import { LoginDto } from './login.dto';

export class SignupDto extends LoginDto {
  @IsString()
  @MinLength(2)
  fullName: string;
}
