import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { XmlService } from './xml.service';
import { CreateXmlDto } from './dto/create-xml.dto';
import { UpdateXmlDto } from './dto/update-xml.dto';

@Controller('xml')
export class XmlController {
  constructor(private readonly xmlService: XmlService) {}

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
