import { SetMetadata } from '@nestjs/common';

export const isPublic = 'isPublic';
export const Public = () => SetMetadata(isPublic, true);
