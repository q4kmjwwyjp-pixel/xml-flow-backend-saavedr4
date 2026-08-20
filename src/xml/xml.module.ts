import { Module } from '@nestjs/common';
import { XmlService } from './xml.service';
import { XmlController } from './xml.controller';

@Module({
  controllers: [XmlController],
  providers: [XmlService],
})
export class XmlModule {}
