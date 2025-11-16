import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  exports: [PrismaService],
  controllers: [],
  providers: [PrismaService],
})
export class PrismaModule {}
