import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';
import { UserRole } from 'generated/prisma/enums';

export class UpdateUserDto extends UpdateProfileDto {
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be a valid UserRole' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
