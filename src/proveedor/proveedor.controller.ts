import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProveedorService } from './proveedor.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

@Controller('proveedor')
export class ProveedorController {
  constructor(private readonly proveedorService: ProveedorService) {}

  @Post()
  create(@Body() proveedorData: {
    rfc: string,
    nombre: string,
    regimenFiscal: string,
  }) {
    return this.proveedorService.create(proveedorData);
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
    @Body() updateData: { nombre?: string; regimenFiscal?: string }
  ) {
    return this.proveedorService.update(rfc, updateData);
  }

  @Delete(':rfc')
  remove(@Param('rfc') rfc: string) {
    return this.proveedorService.remove(rfc);
  }
}
