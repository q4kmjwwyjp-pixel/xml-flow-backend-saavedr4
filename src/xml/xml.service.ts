import { Injectable, BadRequestException } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { PrismaService } from '../prisma/prisma.service';
import { obtenerDatosCatalogoPorRfc } from '../proveedor/catalogo-proveedores.data';

@Injectable()
export class XmlService {
  constructor(private prisma: PrismaService) {}

  private enriquecerFacturaConCodigo(factura: any) {
    if (!factura) return factura;
    if (factura.proveedor) {
      const codigoCatalogo = obtenerDatosCatalogoPorRfc(
        factura.proveedor.rfc
      )?.codigoProveedor;
      factura.proveedor = {
        ...factura.proveedor,
        codigoProveedor:
          factura.proveedor.codigoProveedor || codigoCatalogo || null,
      };
    }
    return factura;
  }

  async procesarYValidarXml(xmlString: string) {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: false,
    });

    const jsonObj = parser.parse(xmlString);
    const comprobante = jsonObj['cfdi:Comprobante'];

    if (!comprobante) {
      throw new BadRequestException(
        'El archivo no tiene la estructura raíz de un CFDI'
      );
    }

    const emisor = comprobante['cfdi:Emisor'];
    const receptor = comprobante['cfdi:Receptor'];
    const complemento = comprobante['cfdi:Complemento'];

    if (!emisor || !receptor) {
      throw new BadRequestException(
        'Falta el nodo Emisor o Receptor en el XML'
      );
    }

    let timbre = null;
    if (complemento) {
      if (Array.isArray(complemento)) {
        const comp = complemento.find((c) => c['tfd:TimbreFiscalDigital']);
        timbre = comp ? comp['tfd:TimbreFiscalDigital'] : null;
      } else {
        timbre = complemento['tfd:TimbreFiscalDigital'];
      }
    }

    const uuid = timbre ? timbre['UUID'] : null;
    if (!uuid) {
      throw new BadRequestException('El XML no está timbrado (falta el UUID)');
    }

    const facturaExistente = await this.prisma.facturaXML.findUnique({
      where: { uuid },
    });

    if (facturaExistente) {
      throw new BadRequestException(
        `La factura con UUID ${uuid} ya fue procesada anteriormente.`
      );
    }

    const rfcProveedor = (emisor['Rfc'] || '').trim().toUpperCase();
    const datosCatalogo = obtenerDatosCatalogoPorRfc(rfcProveedor);
    const nombreProveedor =
      emisor['Nombre'] || datosCatalogo?.nombre || 'Proveedor Sin Nombre';
    const regimenFiscalProveedor =
      emisor['RegimenFiscal'] || datosCatalogo?.regimenFiscal || '601';
    const codigoProveedorCatalogo = datosCatalogo?.codigoProveedor || null;

    const usoCfdi = receptor['UsoCFDI'];
    const regimenReceptor = receptor['RegimenFiscalReceptor'];
    const serie = comprobante['Serie'] || null;
    const folio = comprobante['Folio'] || null;
    const fechaEmision = new Date(comprobante['Fecha']);
    const subTotal = comprobante['SubTotal'];
    const total = comprobante['Total'];
    const metodoPago = comprobante['MetodoPago'];
    const formaPago = comprobante['FormaPago'] || null;
    const condicionesPago = comprobante['CondicionesDePago'] || null;

    /// --- NUEVA LÓGICA DE CRÉDITO Y ESTADO ---
    let diasCredito: number | null = null;
    let fechaEstimadaPago: Date | null = null;

    // Detectar crédito por PPD o texto en condiciones
    const esCredito =
      metodoPago === 'PPD' ||
      (condicionesPago &&
        (condicionesPago.toLowerCase().includes('crédito') ||
          condicionesPago.toLowerCase().includes('credito')));

    if (esCredito) {
      diasCredito = 30;

      const fechaCalculada = new Date(fechaEmision);
      fechaCalculada.setDate(fechaCalculada.getDate() + 30);

      fechaEstimadaPago = fechaCalculada;
    }

    // Definimos el estado inicial según si es crédito o no
    const estadoInicial = esCredito ? 'pendiente' : 'pagado';

    try {
      const proveedor = await this.prisma.proveedor.upsert({
        where: { rfc: rfcProveedor },
        update: {
          nombre: nombreProveedor,
          regimenFiscal: regimenFiscalProveedor,
          ...(codigoProveedorCatalogo
            ? { codigoProveedor: codigoProveedorCatalogo }
            : {}),
        },
        create: {
          codigoProveedor: codigoProveedorCatalogo,
          rfc: rfcProveedor,
          nombre: nombreProveedor,
          regimenFiscal: regimenFiscalProveedor,
        },
      });

      await this.prisma.facturaXML.create({
        data: {
          uuid,
          serie,
          folio,
          fechaEmision,
          subTotal,
          total,
          metodoPago,
          formaPago,
          usoCfdi,
          regimenReceptor,
          condicionesPago,
          diasCredito,
          fechaEstimadaPago,
          estadoValidacion: 'Validada',
          estado: estadoInicial,
          proveedorId: proveedor.id,
        },
      });

      const factura = await this.prisma.facturaXML.findUnique({
        where: { uuid },
        include: { proveedor: true },
      });

      return {
        mensaje: 'XML procesado y guardado correctamente',
        factura: this.enriquecerFacturaConCodigo(factura),
      };
    } catch (error: any) {
      throw new BadRequestException(
        'Error al guardar en la base de datos: ' + error.message
      );
    }
  }

  async obtenerFacturas() {
    const facturas = await this.prisma.facturaXML.findMany({
      include: {
        proveedor: true,
      },
      orderBy: { fechaEmision: 'desc' },
    });
    return facturas.map((f) => this.enriquecerFacturaConCodigo(f));
  }

  async obtenerFacturaPorUuid(uuid: string) {
    const factura = await this.prisma.facturaXML.findUnique({
      where: { uuid },
      include: { proveedor: true },
    });

    if (!factura) {
      throw new BadRequestException('La factura solicitada no existe');
    }
    return this.enriquecerFacturaConCodigo(factura);
  }

  async eliminarFactura(uuid: string) {
    return this.prisma.facturaXML.delete({
      where: { uuid },
    });
  }

  // --- NUEVAS FUNCIONES PARA CAMBIO DE ESTADO ---

  async marcarComoPagado(uuid: string) {
    await this.obtenerFacturaPorUuid(uuid);

    const actualizada = await this.prisma.facturaXML.update({
      where: { uuid },
      data: { estado: 'pagado' },
      include: { proveedor: true },
    });
    return this.enriquecerFacturaConCodigo(actualizada);
  }

  async marcarComoVencido(uuid: string) {
    await this.obtenerFacturaPorUuid(uuid);

    const actualizada = await this.prisma.facturaXML.update({
      where: { uuid },
      data: { estado: 'vencido' },
      include: { proveedor: true },
    });
    return this.enriquecerFacturaConCodigo(actualizada);
  }

  async generarReporteSemanal(filtros: {
    fechaInicio?: string;
    fechaFin?: string;
    criterio?: 'pago' | 'emision' | 'recepcion';
    estado?: string;
    metodoPago?: string;
  }) {
    const where: any = {};

    if (filtros.estado && filtros.estado.toUpperCase() !== 'TODOS') {
      const est = filtros.estado.toLowerCase();
      if (est === 'pagado' || est === 'pendiente' || est === 'vencido') {
        where.estado = est;
      }
    }

    if (filtros.metodoPago && filtros.metodoPago.toUpperCase() !== 'TODAS') {
      where.metodoPago = filtros.metodoPago.toUpperCase();
    }

    if (filtros.fechaInicio || filtros.fechaFin) {
      const rangoFecha: any = {};
      if (filtros.fechaInicio) {
        rangoFecha.gte = new Date(`${filtros.fechaInicio}T00:00:00.000Z`);
      }
      if (filtros.fechaFin) {
        rangoFecha.lte = new Date(`${filtros.fechaFin}T23:59:59.999Z`);
      }

      if (filtros.criterio === 'emision') {
        where.fechaEmision = rangoFecha;
      } else if (filtros.criterio === 'recepcion') {
        where.createdAt = rangoFecha;
      } else {
        where.fechaEstimadaPago = rangoFecha;
      }
    }

    const facturasRaw = await this.prisma.facturaXML.findMany({
      where,
      include: { proveedor: true },
      orderBy: { fechaEmision: 'desc' },
    });

    const facturas = facturasRaw.map((f) => this.enriquecerFacturaConCodigo(f));

    let subtotalAcumulado = 0;
    let impuestosTrasladados = 0;
    let granTotal = 0;
    let montoPagado = 0;
    let montoPendiente = 0;
    let montoVencido = 0;

    const mapaProveedores = new Map<
      number,
      {
        proveedorId: number;
        codigoProveedor: string | null;
        rfc: string;
        nombre: string;
        regimenFiscal: string;
        cantidadFacturas: number;
        subTotal: number;
        impuestos: number;
        total: number;
      }
    >();

    for (const f of facturas) {
      const sub = Number(f.subTotal || 0);
      const tot = Number(f.total || 0);
      const imp = Math.max(0, Number((tot - sub).toFixed(2)));

      subtotalAcumulado += sub;
      impuestosTrasladados += imp;
      granTotal += tot;

      if (f.estado === 'pagado') {
        montoPagado += tot;
      } else if (f.estado === 'vencido') {
        montoVencido += tot;
      } else {
        montoPendiente += tot;
      }

      const provId = f.proveedorId;
      let grupo = mapaProveedores.get(provId);
      if (!grupo) {
        grupo = {
          proveedorId: provId,
          codigoProveedor: f.proveedor?.codigoProveedor || null,
          rfc: f.proveedor?.rfc || 'SIN-RFC',
          nombre: f.proveedor?.nombre || 'Proveedor Desconocido',
          regimenFiscal: f.proveedor?.regimenFiscal || '601',
          cantidadFacturas: 0,
          subTotal: 0,
          impuestos: 0,
          total: 0,
        };
        mapaProveedores.set(provId, grupo);
      }

      grupo.cantidadFacturas += 1;
      grupo.subTotal = Number((grupo.subTotal + sub).toFixed(2));
      grupo.impuestos = Number((grupo.impuestos + imp).toFixed(2));
      grupo.total = Number((grupo.total + tot).toFixed(2));
    }

    return {
      resumen: {
        totalComprobantes: facturas.length,
        subtotalAcumulado: Number(subtotalAcumulado.toFixed(2)),
        impuestosTrasladados: Number(impuestosTrasladados.toFixed(2)),
        granTotal: Number(granTotal.toFixed(2)),
        montoPagado: Number(montoPagado.toFixed(2)),
        montoPendiente: Number(montoPendiente.toFixed(2)),
        montoVencido: Number(montoVencido.toFixed(2)),
      },
      concentradoProveedores: Array.from(mapaProveedores.values()),
      facturas,
    };
  }
}
