import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const prov1 = await prisma.proveedor.upsert({
      where: { rfc: 'PRU010101AA1' },
      update: {
        codigoProveedor: '9901',
        nombre: '[PRUEBAS] PEREZ LOPEZ JUAN CARLOS',
        regimenFiscal: '612',
      },
      create: {
        codigoProveedor: '9901',
        rfc: 'PRU010101AA1',
        nombre: '[PRUEBAS] PEREZ LOPEZ JUAN CARLOS',
        regimenFiscal: '612',
      },
    });

    const prov2 = await prisma.proveedor.upsert({
      where: { rfc: 'PRU020202BB2' },
      update: {
        codigoProveedor: '9902',
        nombre: '[PRUEBAS] GARZA MARTINEZ ROBERTO',
        regimenFiscal: '612',
      },
      create: {
        codigoProveedor: '9902',
        rfc: 'PRU020202BB2',
        nombre: '[PRUEBAS] GARZA MARTINEZ ROBERTO',
        regimenFiscal: '612',
      },
    });

    const prov3 = await prisma.proveedor.upsert({
      where: { rfc: 'PRU030303CC3' },
      update: {
        codigoProveedor: '9903',
        nombre: '[PRUEBAS] LOGISTICA DEL NORTE SA DE CV',
        regimenFiscal: '601',
      },
      create: {
        codigoProveedor: '9903',
        rfc: 'PRU030303CC3',
        nombre: '[PRUEBAS] LOGISTICA DEL NORTE SA DE CV',
        regimenFiscal: '601',
      },
    });

    const hoy = new Date();
    const sumarDias = (dias) => {
      const f = new Date(hoy);
      f.setDate(f.getDate() + dias);
      return f;
    };

    const facturasPrueba = [
      {
        uuid: 'PRUEBA-UUID-0001-AAAA-111111111111',
        serie: 'PRUEBAS',
        folio: '001',
        fechaEmision: sumarDias(-30),
        fechaEstimadaPago: sumarDias(0), // Pago para HOY
        diasCredito: 30,
        subTotal: 12500.0,
        total: 14500.0,
        moneda: 'MXN',
        metodoPago: 'PPD',
        formaPago: '99',
        usoCfdi: 'G03',
        regimenReceptor: '624',
        condicionesPago: '30 días de crédito (XML de Prueba)',
        estadoValidacion: 'Validada',
        estado: 'pendiente',
        folioContrarrecibo: null,
        proveedorId: prov1.id,
      },
      {
        uuid: 'PRUEBA-UUID-0002-BBBB-222222222222',
        serie: 'PRUEBAS',
        folio: '002',
        fechaEmision: sumarDias(-28),
        fechaEstimadaPago: sumarDias(2), // Pago en 2 días
        diasCredito: 30,
        subTotal: 8200.0,
        total: 9512.0,
        moneda: 'MXN',
        metodoPago: 'PPD',
        formaPago: '99',
        usoCfdi: 'G03',
        regimenReceptor: '624',
        condicionesPago: '30 días de crédito (XML de Prueba)',
        estadoValidacion: 'Validada',
        estado: 'pendiente',
        folioContrarrecibo: null,
        proveedorId: prov1.id,
      },
      {
        uuid: 'PRUEBA-UUID-0003-CCCC-333333333333',
        serie: 'PRUEBAS',
        folio: '003',
        fechaEmision: sumarDias(-10),
        fechaEstimadaPago: sumarDias(5), // Pago en 5 días
        diasCredito: 15,
        subTotal: 21000.0,
        total: 24360.0,
        moneda: 'MXN',
        metodoPago: 'PPD',
        formaPago: '99',
        usoCfdi: 'G03',
        regimenReceptor: '624',
        condicionesPago: '15 días de crédito (XML de Prueba)',
        estadoValidacion: 'Validada',
        estado: 'pendiente',
        folioContrarrecibo: null,
        proveedorId: prov2.id,
      },
      {
        uuid: 'PRUEBA-UUID-0004-DDDD-444444444444',
        serie: 'PRUEBAS',
        folio: '004',
        fechaEmision: sumarDias(-8),
        fechaEstimadaPago: sumarDias(7), // Pago en 7 días
        diasCredito: 15,
        subTotal: 1500.0,
        total: 1740.0,
        moneda: 'USD',
        metodoPago: 'PPD',
        formaPago: '99',
        usoCfdi: 'G03',
        regimenReceptor: '624',
        condicionesPago: '15 días de crédito en Dólares (XML de Prueba)',
        estadoValidacion: 'Validada',
        estado: 'pendiente',
        folioContrarrecibo: null,
        proveedorId: prov3.id,
      },
      {
        uuid: 'PRUEBA-UUID-0005-EEEE-555555555555',
        serie: 'PRUEBAS',
        folio: '005',
        fechaEmision: sumarDias(-5),
        fechaEstimadaPago: sumarDias(10), // Pago en 10 días
        diasCredito: 15,
        subTotal: 34000.0,
        total: 39440.0,
        moneda: 'MXN',
        metodoPago: 'PPD',
        formaPago: '99',
        usoCfdi: 'G03',
        regimenReceptor: '624',
        condicionesPago: '15 días de crédito (XML de Prueba)',
        estadoValidacion: 'Validada',
        estado: 'pendiente',
        folioContrarrecibo: null,
        proveedorId: prov3.id,
      },
    ];

    for (const item of facturasPrueba) {
      await prisma.facturaXML.upsert({
        where: { uuid: item.uuid },
        update: item,
        create: item,
      });
    }
    console.log('5 facturas XML de PRUEBAS insertadas con éxito.');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
