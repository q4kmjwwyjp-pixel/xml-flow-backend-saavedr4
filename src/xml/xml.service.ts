import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateXmlDto } from './dto/create-xml.dto';
import { UpdateXmlDto } from './dto/update-xml.dto';
import { XMLParser } from 'fast-xml-parser';

@Injectable()
export class XmlService {

  procesarYValidarXml(xmlString: string) {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const jsonObj = parser.parse(xmlString);

    const comprobante = jsonObj['cfdi:Comprobante'];
    if (!comprobante) {
      throw new BadRequestException('El archivo no tiene el formato de un CFDI válido');
    }

    const receptor = comprobante['cfdi:Receptor'];
    if (!receptor) {
      throw new BadRequestException('El XML no contiene información del receptor');
    }

    const rfcReceptor = receptor['Rfc'];
    const regimenFiscal = receptor['RegimenFiscalReceptor'];
    const usoCfdi = receptor['UsoCFDI'];

    if (!rfcReceptor || rfcReceptor.length < 12) {
      throw new BadRequestException('RFC de receptor inválido o ausente');
    }
    if (!regimenFiscal) {
      throw new BadRequestException('Falta el régimen fiscal del receptor');
    }
    if (!usoCfdi) {
      throw new BadRequestException('Falta el uso de CFDI');
    }

    return {
      mensaje: 'XML válido y procesado con éxito',
      datosFiscales: {
        rfc: rfcReceptor,
        regimen: regimenFiscal,
        uso: usoCfdi
      }
    };
  }

  create(createXmlDto: CreateXmlDto) {
    return 'This action adds a new xml';
  }

  findAll() {
    return `This action returns all xml`;
  }

  findOne(id: number) {
    return `This action returns a #${id} xml`;
  }

  update(id: number, updateXmlDto: UpdateXmlDto) {
    return `This action updates a #${id} xml`;
  }

  remove(id: number) {
    return `This action removes a #${id} xml`;
  }
}