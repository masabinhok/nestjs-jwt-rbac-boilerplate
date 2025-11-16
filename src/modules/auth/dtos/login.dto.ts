import { IsEmail, IsString } from 'class-validator';
import { IsStrongPassword } from 'src/common/validators/password.validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsStrongPassword()
  password: string;
}
