import { Controller, Delete, Get, Post, Param, Req, Body, BadRequestException, Patch, Query } from '@nestjs/common';
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

  @Get('reporte/semanal')
  async obtenerReporteSemanal(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('criterio') criterio?: 'pago' | 'emision' | 'recepcion',
    @Query('estado') estado?: string,
    @Query('metodoPago') metodoPago?: string,
  ) {
    return this.xmlService.generarReporteSemanal({
      fechaInicio,
      fechaFin,
      criterio,
      estado,
      metodoPago,
    });
  }

  @Get(':uuid')
  async obtenerFacturaPorUuid(@Param('uuid') uuid: string) {
    return this.xmlService.obtenerFacturaPorUuid(uuid);
  }

  @Delete('delete')
  async eliminarFactura(@Body('uuid') uuid: string) {
    return this.xmlService.eliminarFactura(uuid)
  }

  // --- NUEVOS ENDPOINTS PARA ESTADOS ---

  @Patch(':uuid/pagado')
  async marcarComoPagado(@Param('uuid') uuid: string) {
    return this.xmlService.marcarComoPagado(uuid);
  }

  @Patch(':uuid/vencido')
  async marcarComoVencido(@Param('uuid') uuid: string) {
    return this.xmlService.marcarComoVencido(uuid);
  }
}