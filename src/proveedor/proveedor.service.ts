import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CATALOGO_PROVEEDORES,
  obtenerDatosCatalogoPorRfc,
} from './catalogo-proveedores.data';

@Injectable()
export class ProveedorService implements OnModuleInit {
  private sincronizando = false;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.sincronizarCatalogoBase().catch((err) =>
      console.warn('Aviso al sincronizar catálogo de proveedores:', err)
    );
  }

  async sincronizarCatalogoBase() {
    if (this.sincronizando) {
      return { mensaje: 'Sincronización en curso' };
    }
    this.sincronizando = true;
    try {
      const existentes = await this.prisma.proveedor.findMany({
        select: { id: true, rfc: true, codigoProveedor: true },
      });

      for (const prov of existentes) {
        if (!prov.codigoProveedor) {
          const delCatalogo = obtenerDatosCatalogoPorRfc(prov.rfc);
          if (delCatalogo?.codigoProveedor) {
            await this.prisma.proveedor.update({
              where: { id: prov.id },
              data: { codigoProveedor: delCatalogo.codigoProveedor },
            });
          }
        }
      }

      const batchSize = 500;
      let insertados = 0;
      for (let i = 0; i < CATALOGO_PROVEEDORES.length; i += batchSize) {
        const lote = CATALOGO_PROVEEDORES.slice(i, i + batchSize).map(
          (item) => ({
            codigoProveedor: item.codigoProveedor,
            rfc: item.rfc,
            nombre: item.nombre,
            regimenFiscal: item.regimenFiscal,
          })
        );
        const res = await this.prisma.proveedor.createMany({
          data: lote,
          skipDuplicates: true,
        });
        insertados += res.count;
      }

      return {
        mensaje: 'Catálogo de proveedores sincronizado correctamente',
        totalCatalogo: CATALOGO_PROVEEDORES.length,
        nuevosInsertados: insertados,
      };
    } finally {
      this.sincronizando = false;
    }
  }

  async importarLote(
    proveedores: Array<{
      codigoProveedor?: string;
      rfc: string;
      nombre: string;
      regimenFiscal?: string;
    }>
  ) {
    let procesados = 0;
    for (const p of proveedores) {
      const rfc = (p.rfc || '').trim().toUpperCase();
      const nombre = (p.nombre || '').trim();
      if (!rfc || !nombre) continue;

      const delCatalogo = obtenerDatosCatalogoPorRfc(rfc);
      const codigoProveedor =
        (p.codigoProveedor || '').trim() ||
        delCatalogo?.codigoProveedor ||
        null;
      const regimenFiscal =
        (p.regimenFiscal || '').trim() ||
        delCatalogo?.regimenFiscal ||
        (rfc.length === 12 ? '601' : '612');

      await this.prisma.proveedor.upsert({
        where: { rfc },
        update: {
          nombre,
          regimenFiscal,
          ...(codigoProveedor ? { codigoProveedor } : {}),
        },
        create: {
          rfc,
          nombre,
          regimenFiscal,
          codigoProveedor,
        },
      });
      procesados++;
    }
    return {
      mensaje: 'Proveedores importados correctamente',
      procesados,
    };
  }

  async create(proveedorData: {
    codigoProveedor?: string;
    rfc: string;
    nombre: string;
    regimenFiscal: string;
  }) {
    const rfc = proveedorData.rfc.trim().toUpperCase();
    const delCatalogo = obtenerDatosCatalogoPorRfc(rfc);
    const codigoProveedor =
      (proveedorData.codigoProveedor || '').trim() ||
      delCatalogo?.codigoProveedor ||
      null;

    return this.prisma.proveedor.upsert({
      where: { rfc },
      update: {
        nombre: proveedorData.nombre.trim(),
        regimenFiscal:
          proveedorData.regimenFiscal?.trim() ||
          delCatalogo?.regimenFiscal ||
          (rfc.length === 12 ? '601' : '612'),
        ...(codigoProveedor ? { codigoProveedor } : {}),
      },
      create: {
        codigoProveedor,
        rfc,
        nombre: proveedorData.nombre.trim(),
        regimenFiscal:
          proveedorData.regimenFiscal?.trim() ||
          delCatalogo?.regimenFiscal ||
          (rfc.length === 12 ? '601' : '612'),
      },
    });
  }

  async findAll() {
    const enBd = await this.prisma.proveedor.findMany();
    const mapaPorRfc = new Map<string, any>();

    // Primero cargamos el catálogo base del Excel
    for (const item of CATALOGO_PROVEEDORES) {
      mapaPorRfc.set(item.rfc.toUpperCase(), {
        codigoProveedor: item.codigoProveedor,
        rfc: item.rfc,
        nombre: item.nombre,
        regimenFiscal: item.regimenFiscal,
      });
    }

    // Sobrescribimos/enriquecemos con los registros reales de la BD
    for (const p of enBd) {
      const rfcKey = p.rfc.toUpperCase();
      const previo = mapaPorRfc.get(rfcKey);
      mapaPorRfc.set(rfcKey, {
        ...p,
        codigoProveedor:
          p.codigoProveedor || previo?.codigoProveedor || null,
      });
    }

    return Array.from(mapaPorRfc.values()).sort((a, b) => {
      const numA = Number(a.codigoProveedor);
      const numB = Number(b.codigoProveedor);
      const validA = !Number.isNaN(numA) && a.codigoProveedor != null && a.codigoProveedor !== '';
      const validB = !Number.isNaN(numB) && b.codigoProveedor != null && b.codigoProveedor !== '';
      if (validA && validB) return numA - numB;
      if (validA) return -1;
      if (validB) return 1;
      return (a.nombre || '').localeCompare(b.nombre || '', 'es');
    });
  }

  async findOne(RFC: string) {
    const rfcUpper = RFC.trim().toUpperCase();
    const prov = await this.prisma.proveedor.findUnique({
      where: {
        rfc: rfcUpper,
      },
    });
    if (!prov) {
      return obtenerDatosCatalogoPorRfc(rfcUpper);
    }
    return {
      ...prov,
      codigoProveedor:
        prov.codigoProveedor ||
        obtenerDatosCatalogoPorRfc(prov.rfc)?.codigoProveedor ||
        null,
    };
  }

  async update(
    RFC: string,
    updateProveedorDto: Partial<{
      codigoProveedor: string;
      nombre: string;
      regimenFiscal: string;
    }>
  ) {
    const rfcUpper = RFC.trim().toUpperCase();
    const delCatalogo = obtenerDatosCatalogoPorRfc(rfcUpper);
    const data: Record<string, any> = {};
    if (updateProveedorDto.nombre !== undefined) {
      data.nombre = updateProveedorDto.nombre.trim();
    }
    if (updateProveedorDto.regimenFiscal !== undefined) {
      data.regimenFiscal = updateProveedorDto.regimenFiscal.trim();
    }
    if (updateProveedorDto.codigoProveedor !== undefined) {
      data.codigoProveedor = updateProveedorDto.codigoProveedor.trim() || null;
    }

    return this.prisma.proveedor.upsert({
      where: { rfc: rfcUpper },
      update: data,
      create: {
        rfc: rfcUpper,
        nombre:
          data.nombre || delCatalogo?.nombre || 'Proveedor Actualizado',
        regimenFiscal:
          data.regimenFiscal ||
          delCatalogo?.regimenFiscal ||
          (rfcUpper.length === 12 ? '601' : '612'),
        codigoProveedor:
          data.codigoProveedor !== undefined
            ? data.codigoProveedor
            : delCatalogo?.codigoProveedor || null,
      },
    });
  }

  async remove(RFC: string) {
    return this.prisma.proveedor.delete({
      where: {
        rfc: RFC.trim().toUpperCase(),
      },
    });
  }
}
