import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { XmlService } from './xml.service';
import { CreateXmlDto } from './dto/create-xml.dto';
import { UpdateXmlDto } from './dto/update-xml.dto';
import { Request } from 'express';


@Controller('xml')
export class XmlController {
  constructor(private readonly xmlService: XmlService) { }

  // Opción activa para probar enviando el XML como texto en un JSON
  @Post('upload')
  async uploadXml(@Req() req: any) {
    let xmlString = '';
    for await (const chunk of req) {
      xmlString += chunk;
    }
    return this.xmlService.procesarYValidarXml(xmlString);
  }

  /* 
  // Opción original para conectar la app con archivos reales:
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadXmlFile(@UploadedFile() file: { buffer: Buffer }) {
    return this.xmlService.procesarYValidarXml(file.buffer.toString('utf-8'));
  }
  */

  @Post()
  create(@Body() createXmlDto: CreateXmlDto) {
    return this.xmlService.create(createXmlDto);
  }

  @Get()
  findAll() {
    return this.xmlService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.xmlService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateXmlDto: UpdateXmlDto) {
    return this.xmlService.update(+id, updateXmlDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.xmlService.remove(+id);
  }
}