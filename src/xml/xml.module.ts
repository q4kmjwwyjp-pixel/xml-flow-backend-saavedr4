import { Module } from '@nestjs/common';
import { XmlService } from './xml.service';
import { XmlController } from './xml.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [XmlController],
  providers: [XmlService, PrismaService],
})
export class XmlModule {}
