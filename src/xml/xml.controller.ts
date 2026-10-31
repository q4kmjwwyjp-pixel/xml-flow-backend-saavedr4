import {
  Controller,
  Delete,
  Get,
  Post,
  Param,
  Req,
  Body,
  BadRequestException,
  Patch,
  Query,
} from '@nestjs/common';
import { XmlService } from './xml.service';
import { UpdateXmlDto } from './dto/update-xml.dto';

@Controller('xml')
export class XmlController {
  constructor(private readonly xmlService: XmlService) {}

  @Post('upload')
  async uploadXml(@Req() req: any) {
    let xmlString = '';

    for await (const chunk of req) {
      xmlString += chunk;
    }

    if (!xmlString || xmlString.trim() === '') {
      throw new BadRequestException(
        'El cuerpo de la petición está vacío o no contiene un XML válido'
      );
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
    @Query('moneda') moneda?: string,
    @Query('folioContrarrecibo') folioContrarrecibo?: string,
    @Query('soloConContrarrecibo') soloConContrarrecibo?: string,
    @Query('ordenFolio') ordenFolio?: 'asc' | 'desc'
  ) {
    return this.xmlService.generarReporteSemanal({
      fechaInicio,
      fechaFin,
      criterio,
      estado,
      metodoPago,
      moneda,
      folioContrarrecibo,
      soloConContrarrecibo,
      ordenFolio,
    });
  }

  @Get(':uuid')
  async obtenerFacturaPorUuid(@Param('uuid') uuid: string) {
    return this.xmlService.obtenerFacturaPorUuid(uuid);
  }

  @Delete('delete')
  async eliminarFactura(@Body('uuid') uuid: string) {
    return this.xmlService.eliminarFactura(uuid);
  }

  @Delete(':uuid')
  async eliminarFacturaPorParam(@Param('uuid') uuid: string) {
    return this.xmlService.eliminarFactura(uuid);
  }

  // --- ENDPOINTS PARA ESTADOS Y CONTRARRECIBO ---

  @Patch(':uuid/contrarrecibo')
  async actualizarContrarrecibo(
    @Param('uuid') uuid: string,
    @Body() updateXmlDto: UpdateXmlDto
  ) {
    return this.xmlService.actualizarContrarrecibo(uuid, updateXmlDto);
  }

  @Patch(':uuid')
  async actualizarManual(
    @Param('uuid') uuid: string,
    @Body() updateXmlDto: UpdateXmlDto
  ) {
    return this.xmlService.actualizarContrarrecibo(uuid, updateXmlDto);
  }

  @Patch(':uuid/pagado')
  async marcarComoPagado(
    @Param('uuid') uuid: string,
    @Body('folioContrarrecibo') folioContrarrecibo?: string
  ) {
    return this.xmlService.marcarComoPagado(uuid, folioContrarrecibo);
  }

  @Patch(':uuid/vencido')
  async marcarComoVencido(
    @Param('uuid') uuid: string,
    @Body('folioContrarrecibo') folioContrarrecibo?: string
  ) {
    return this.xmlService.marcarComoVencido(uuid, folioContrarrecibo);
  }
}
