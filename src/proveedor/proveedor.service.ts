import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CATALOGO_PROVEEDORES,
  obtenerDatosCatalogoPorRfc,
} from './catalogo-proveedores.data';

@Injectable()
export class ProveedorService implements OnModuleInit {
  private sincronizando = false;

  constructor(private prisma: PrismaService) {}

  private normalizarTexto(valor?: string | null): string {
    return (valor || '').trim().replace(/\s+/g, ' ').toUpperCase();
  }

  private normalizarCodigo(valor?: string | null): string {
    const limpio = (valor || '').trim().replace(/^#+/, '').trim().toUpperCase();
    return limpio === 'S/N' ? '' : limpio;
  }

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
    const existentes = await this.findAll();
    const codigosOcupados = new Set<string>();
    const rfcsOcupados = new Set<string>();
    const nombresOcupados = new Set<string>();

    for (const ex of existentes) {
      const cod = this.normalizarCodigo(ex.codigoProveedor);
      const rfc = this.normalizarTexto(ex.rfc);
      const nom = this.normalizarTexto(ex.nombre);
      if (cod) codigosOcupados.add(cod);
      if (rfc) rfcsOcupados.add(rfc);
      if (nom) nombresOcupados.add(nom);
    }

    let nuevosInsertados = 0;
    let omitidosPorDuplicado = 0;

    for (const p of proveedores) {
      const rfc = (p.rfc || '').trim().toUpperCase();
      const nombre = (p.nombre || '').trim().replace(/\s+/g, ' ');
      if (!rfc || !nombre) continue;

      const codigoInput = (p.codigoProveedor || '')
        .trim()
        .replace(/^#+/, '')
        .trim();
      const delCatalogo = obtenerDatosCatalogoPorRfc(rfc);
      const codigoProveedor =
        codigoInput || delCatalogo?.codigoProveedor || null;

      const codNorm = this.normalizarCodigo(codigoProveedor);
      const rfcNorm = this.normalizarTexto(rfc);
      const nomNorm = this.normalizarTexto(nombre);

      // Si ya existe por Código de Proveedor, RFC o Razón Social, no se duplica
      if (
        (codNorm && codigosOcupados.has(codNorm)) ||
        rfcsOcupados.has(rfcNorm) ||
        nombresOcupados.has(nomNorm)
      ) {
        omitidosPorDuplicado++;
        continue;
      }

      if (codNorm) codigosOcupados.add(codNorm);
      rfcsOcupados.add(rfcNorm);
      nombresOcupados.add(nomNorm);

      const regimenFiscal =
        (p.regimenFiscal || '').trim() ||
        delCatalogo?.regimenFiscal ||
        (rfc.length === 12 ? '601' : '612');

      await this.prisma.proveedor.create({
        data: {
          rfc,
          nombre,
          regimenFiscal,
          codigoProveedor,
        },
      });
      nuevosInsertados++;
    }

    return {
      mensaje: 'Proveedores procesados sin duplicados',
      nuevosInsertados,
      omitidosPorDuplicado,
      procesados: nuevosInsertados,
    };
  }

  async create(proveedorData: {
    codigoProveedor?: string;
    rfc: string;
    nombre: string;
    regimenFiscal: string;
    diasCredito?: number | null;
  }) {
    const rfc = (proveedorData.rfc || '').trim().toUpperCase();
    const nombre = (proveedorData.nombre || '')
      .replace(/,/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
    const codigoInput = (proveedorData.codigoProveedor || '')
      .trim()
      .replace(/^#+/, '')
      .trim();

    if (!rfc || !nombre) {
      throw new BadRequestException(
        'El RFC y la Razón Social (Apellidos Nombre) son obligatorios.'
      );
    }

    if (nombre.split(' ').filter((w) => w.length > 0).length < 2) {
      throw new BadRequestException(
        'Debes ingresar el nombre bajo el formato "Apellidos Nombre" (mínimo un apellido y un nombre).'
      );
    }

    const codigoNorm = this.normalizarCodigo(codigoInput);
    const rfcNorm = this.normalizarTexto(rfc);
    const nombreNorm = this.normalizarTexto(nombre);

    const existentes = await this.findAll();
    const errores: string[] = [];

    if (codigoNorm) {
      const dupCodigo = existentes.find(
        (p) => this.normalizarCodigo(p.codigoProveedor) === codigoNorm
      );
      if (dupCodigo) {
        errores.push(
          `El N° de Proveedor (Clave) "${codigoInput}" ya está ocupado por "${dupCodigo.nombre}".`
        );
      }
    }

    const dupRfc = existentes.find(
      (p) => this.normalizarTexto(p.rfc) === rfcNorm
    );
    if (dupRfc) {
      errores.push(
        `El RFC "${rfc}" ya está registrado (${dupRfc.nombre}).`
      );
    }

    const dupNombre = existentes.find(
      (p) => this.normalizarTexto(p.nombre) === nombreNorm
    );
    if (dupNombre) {
      errores.push(
        `La Razón Social "${nombre}" ya está registrada (RFC: ${dupNombre.rfc}).`
      );
    }

    if (errores.length > 0) {
      throw new ConflictException(errores.join(' '));
    }

    const regimenFiscal =
      proveedorData.regimenFiscal?.trim() || (rfc.length === 12 ? '601' : '612');

    const diasNum = Number(proveedorData.diasCredito);
    const diasCredito =
      !Number.isNaN(diasNum) && diasNum >= 0 ? diasNum : null;

    return this.prisma.proveedor.create({
      data: {
        codigoProveedor: codigoInput || null,
        rfc,
        nombre,
        regimenFiscal,
        diasCredito,
      } as any,
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
        diasCredito: item.diasCredito ?? 0,
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
        diasCredito:
          (p as any).diasCredito !== null && (p as any).diasCredito !== undefined
            ? (p as any).diasCredito
            : previo?.diasCredito ?? null,
      });
    }

    // Garantizar que no existan duplicados por código de proveedor ni por razón social
    const codigosVistos = new Set<string>();
    const nombresVistos = new Set<string>();
    const unicos: any[] = [];

    for (const p of mapaPorRfc.values()) {
      const codNorm = this.normalizarCodigo(p.codigoProveedor);
      const nomNorm = this.normalizarTexto(p.nombre);

      if (
        (codNorm && codigosVistos.has(codNorm)) ||
        (nomNorm && nombresVistos.has(nomNorm))
      ) {
        continue;
      }

      if (codNorm) codigosVistos.add(codNorm);
      if (nomNorm) nombresVistos.add(nomNorm);
      unicos.push(p);
    }

    return unicos.sort((a, b) => {
      const numA = Number(a.codigoProveedor);
      const numB = Number(b.codigoProveedor);
      const validA =
        !Number.isNaN(numA) &&
        a.codigoProveedor != null &&
        a.codigoProveedor !== '';
      const validB =
        !Number.isNaN(numB) &&
        b.codigoProveedor != null &&
        b.codigoProveedor !== '';
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
      diasCredito:
        (prov as any).diasCredito !== null &&
        (prov as any).diasCredito !== undefined
          ? (prov as any).diasCredito
          : obtenerDatosCatalogoPorRfc(prov.rfc)?.diasCredito ?? null,
    };
  }

  async update(
    RFC: string,
    updateProveedorDto: Partial<{
      codigoProveedor: string;
      nombre: string;
      regimenFiscal: string;
      diasCredito: number | null;
    }>
  ) {
    const rfcUpper = RFC.trim().toUpperCase();
    const rfcNorm = this.normalizarTexto(rfcUpper);
    const delCatalogo = obtenerDatosCatalogoPorRfc(rfcUpper);
    const data: Record<string, any> = {};

    const existentes = await this.findAll();
    const otrosProveedores = existentes.filter(
      (p) => this.normalizarTexto(p.rfc) !== rfcNorm
    );
    const errores: string[] = [];

    if (updateProveedorDto.codigoProveedor !== undefined) {
      const codigoInput = updateProveedorDto.codigoProveedor
        .trim()
        .replace(/^#+/, '')
        .trim();
      const codigoNorm = this.normalizarCodigo(codigoInput);

      if (codigoNorm) {
        const dupCodigo = otrosProveedores.find(
          (p) => this.normalizarCodigo(p.codigoProveedor) === codigoNorm
        );
        if (dupCodigo) {
          errores.push(
            `El N° de Proveedor (Clave) "${codigoInput}" ya está ocupado por "${dupCodigo.nombre}".`
          );
        }
      }
      data.codigoProveedor = codigoInput || null;
    }

    if (updateProveedorDto.nombre !== undefined) {
      const nombreLimpio = updateProveedorDto.nombre
        .replace(/,/g, ' ')
        .trim()
        .replace(/\s+/g, ' ')
        .toUpperCase();
      if (nombreLimpio.split(' ').filter((w) => w.length > 0).length < 2) {
        throw new BadRequestException(
          'Debes ingresar el nombre bajo el formato "Apellidos Nombre" (mínimo un apellido y un nombre).'
        );
      }
      const nombreNorm = this.normalizarTexto(nombreLimpio);

      if (nombreNorm) {
        const dupNombre = otrosProveedores.find(
          (p) => this.normalizarTexto(p.nombre) === nombreNorm
        );
        if (dupNombre) {
          errores.push(
            `La Razón Social "${nombreLimpio}" ya está registrada (RFC: ${dupNombre.rfc}).`
          );
        }
      }
      data.nombre = nombreLimpio;
    }

    if (errores.length > 0) {
      throw new ConflictException(errores.join(' '));
    }

    if (updateProveedorDto.regimenFiscal !== undefined) {
      data.regimenFiscal = updateProveedorDto.regimenFiscal.trim();
    }

    if (updateProveedorDto.diasCredito !== undefined) {
      const diasNum = Number(updateProveedorDto.diasCredito);
      data.diasCredito =
        !Number.isNaN(diasNum) && diasNum >= 0 ? diasNum : null;
    }

    return this.prisma.proveedor.upsert({
      where: { rfc: rfcUpper },
      update: data as any,
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
        diasCredito:
          data.diasCredito !== undefined
            ? data.diasCredito
            : delCatalogo?.diasCredito ?? null,
      } as any,
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
