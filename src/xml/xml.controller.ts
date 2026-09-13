import { Controller,Delete, Get, Post, Param, Req, Body, BadRequestException } from '@nestjs/common';
import { XmlService } from './xml.service';

@Controller('xml')
export class XmlController {
  constructor(private readonly xmlService: XmlService) { }

  @Post('upload')
  async uploadXml(@Req() req: any) {
    let xmlString = '';
    
    for await (const chunk of req) {
      xmlString += chunk;
    }

    if (!xmlString || xmlString.trim() === '') {
      throw new BadRequestException('El cuerpo de la petición está vacío o no contiene un XML válido');
    }

    return this.xmlService.procesarYValidarXml(xmlString);
  }

  @Get()
  async obtenerTodasLasFacturas() {
    return this.xmlService.obtenerFacturas();
  }

  @Get(':uuid')
  async obtenerFacturaPorUuid(@Param('uuid') uuid: string) {
    return this.xmlService.obtenerFacturaPorUuid(uuid);
  }

  @Delete('delete')
  async eliminarFactura(@Body('uuid') uuid: string) {
    return this.xmlService.eliminarFactura(uuid)
  }
}