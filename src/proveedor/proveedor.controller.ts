import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProveedorService } from './proveedor.service';

@Controller('proveedor')
export class ProveedorController {
  constructor(private readonly proveedorService: ProveedorService) {}

  @Post()
  create(
    @Body()
    proveedorData: {
      codigoProveedor?: string;
      rfc: string;
      nombre: string;
      regimenFiscal: string;
      diasCredito?: number | null;
    }
  ) {
    return this.proveedorService.create(proveedorData);
  }

  @Post('sync-catalogo')
  sincronizarCatalogo() {
    return this.proveedorService.sincronizarCatalogoBase();
  }

  @Post('bulk')
  importarLote(
    @Body('proveedores')
    proveedores: Array<{
      codigoProveedor?: string;
      rfc: string;
      nombre: string;
      regimenFiscal?: string;
    }>
  ) {
    return this.proveedorService.importarLote(proveedores || []);
  }

  @Get()
  findAll() {
    return this.proveedorService.findAll();
  }

  @Get(':rfc')
  findOne(@Param('rfc') rfc: string) {
    return this.proveedorService.findOne(rfc);
  }

  @Patch(':rfc')
  update(
    @Param('rfc') rfc: string,
    @Body()
    updateData: {
      codigoProveedor?: string;
      nombre?: string;
      regimenFiscal?: string;
      diasCredito?: number | null;
    }
  ) {
    return this.proveedorService.update(rfc, updateData);
  }

  @Delete(':rfc')
  remove(@Param('rfc') rfc: string) {
    return this.proveedorService.remove(rfc);
  }
}
