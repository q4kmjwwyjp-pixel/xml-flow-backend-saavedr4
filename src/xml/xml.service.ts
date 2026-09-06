import { Injectable, BadRequestException } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class XmlService {
  constructor(private prisma: PrismaService) {}

  async procesarYValidarXml(xmlString: string) {
    const parser = new XMLParser({ 
      ignoreAttributes: false, 
      attributeNamePrefix: "",
      parseAttributeValue: false 
    });
    
    const jsonObj = parser.parse(xmlString);
    const comprobante = jsonObj['cfdi:Comprobante'];

    if (!comprobante) {
      throw new BadRequestException('El archivo no tiene la estructura raíz de un CFDI');
    }

    const emisor = comprobante['cfdi:Emisor'];
    const receptor = comprobante['cfdi:Receptor'];
    const complemento = comprobante['cfdi:Complemento'];
    
    if (!emisor || !receptor) {
      throw new BadRequestException('Falta el nodo Emisor o Receptor en el XML');
    }

    let timbre = null;
    if (complemento) {
      if (Array.isArray(complemento)) {
        const comp = complemento.find(c => c['tfd:TimbreFiscalDigital']);
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
      where: { uuid }
    });

    if (facturaExistente) {
      throw new BadRequestException(`La factura con UUID ${uuid} ya fue procesada anteriormente.`);
    }

    const rfcProveedor = emisor['Rfc'];
    const nombreProveedor = emisor['Nombre'];
    const regimenFiscalProveedor = emisor['RegimenFiscal']; 

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

    try {
      // Upsert de Proveedor: Crea si no existe, actualiza si ya existe
      const proveedor = await this.prisma.proveedor.upsert({
        where: { rfc: rfcProveedor },
        update: {
          nombre: nombreProveedor,
          regimenFiscal: regimenFiscalProveedor,
        },
        create: {
          rfc: rfcProveedor,
          nombre: nombreProveedor,
          regimenFiscal: regimenFiscalProveedor,
        }
      });

      // Crear la Factura vinculada al Proveedor
      const factura = await this.prisma.facturaXML.create({
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
          diasCredito: 0, 
          estadoValidacion: 'Validada',
          motivoRechazo: null,
          proveedorId: proveedor.id
        }
      });

      return {
        mensaje: 'XML procesado y guardado correctamente',
        factura: factura
      };

    } catch (error: any) {
      throw new BadRequestException('Error al guardar en la base de datos: ' + error.message);
    }
  }




  
  async obtenerFacturas() {
    return await this.prisma.facturaXML.findMany({
      include: {
        proveedor: true,
        pagoProgramado: true
      },
      orderBy: { fechaEmision: 'desc' }
    });
  }

  async obtenerFacturaPorUuid(uuid: string) {
    const factura = await this.prisma.facturaXML.findUnique({
      where: { uuid },
      include: { proveedor: true, pagoProgramado: true }
    });

    if (!factura) {
      throw new BadRequestException('La factura solicitada no existe');
    }
    return factura;
  }
}