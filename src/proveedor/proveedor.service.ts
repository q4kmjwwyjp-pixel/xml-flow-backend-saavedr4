import { Injectable } from '@nestjs/common';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProveedorService {
  constructor(private prisma: PrismaService) {}

  create(proveedorData: {
    rfc: string,
    nombre: string,
    regimenFiscal: string,
  }) {
    return this.prisma.proveedor.create({
      data: {
        rfc: proveedorData.rfc,
        nombre: proveedorData.nombre,
        regimenFiscal: proveedorData.regimenFiscal
      }
    })
  }

  findAll() {
    return this.prisma.proveedor.findMany()
  }

  findOne(RFC: string) {
    return this.prisma.proveedor.findUnique({
      where: {
        rfc: RFC
      }
    })
  }
}
