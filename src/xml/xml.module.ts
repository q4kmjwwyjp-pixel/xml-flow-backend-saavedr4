import { Module } from '@nestjs/common';
import { XmlService } from './xml.service';
import { XmlController } from './xml.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [XmlController],
  providers: [XmlService],
})
export class XmlModule {}
