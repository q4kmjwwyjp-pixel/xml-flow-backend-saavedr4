import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const OLD_API_URL = 'https://xml-flow-back-end.onrender.com';

async function fetchJsonSafe(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('1. Clonando/creando usuarios en la nueva base de datos independiente...');
    const usuariosRemotos = await fetchJsonSafe(`${OLD_API_URL}/users`);
    if (Array.isArray(usuariosRemotos) && usuariosRemotos.length > 0) {
      for (const u of usuariosRemotos) {
        if (!u?.email || !u?.password) continue;
        await prisma.users.upsert({
          where: { email: u.email },
          update: { name: u.name || 'Usuario', password: u.password },
          create: {
            name: u.name || 'Usuario',
            email: u.email,
            password: u.password,
          },
        });
      }
      console.log(`   -> ${usuariosRemotos.length} usuarios clonados de la base anterior.`);
    }

    // Asegurar un usuario administrador por defecto por si se requiere iniciar sesión
    const defaultEmail = 'admin@xmlflow.com';
    const existeAdmin = await prisma.users.findUnique({ where: { email: defaultEmail } });
    if (!existeAdmin) {
      const hash = await bcrypt.hash('admin123', 10);
      await prisma.users.create({
        data: {
          name: 'Administrador Local',
          email: defaultEmail,
          password: hash,
        },
      });
      console.log('   -> Usuario por defecto asegurado: admin@xmlflow.com / admin123');
    }

    console.log('2. Clonando proveedores existentes desde la base anterior...');
    const provRemotos = await fetchJsonSafe(`${OLD_API_URL}/proveedor`);
    if (Array.isArray(provRemotos) && provRemotos.length > 0) {
      const batchSize = 500;
      let insertados = 0;
      for (let i = 0; i < provRemotos.length; i += batchSize) {
        const lote = provRemotos
          .slice(i, i + batchSize)
          .filter((p) => p?.rfc && p?.nombre)
          .map((p) => ({
            codigoProveedor: p.codigoProveedor ? String(p.codigoProveedor) : null,
            rfc: String(p.rfc).trim().toUpperCase(),
            nombre: String(p.nombre).trim(),
            regimenFiscal: String(p.regimenFiscal || '601').trim(),
          }));
        const res = await prisma.proveedor.createMany({
          data: lote,
          skipDuplicates: true,
        });
        insertados += res.count;
      }
      console.log(`   -> ${insertados} proveedores insertados en la nueva BD.`);
    }

    console.log('3. Clonando facturas XML existentes desde la base anterior...');
    const facturasRemotas = await fetchJsonSafe(`${OLD_API_URL}/xml`);
    if (Array.isArray(facturasRemotas) && facturasRemotas.length > 0) {
      let facturasClonadas = 0;
      for (const f of facturasRemotas) {
        if (!f?.uuid || !f?.proveedor?.rfc) continue;
        const rfcProv = String(f.proveedor.rfc).trim().toUpperCase();
        const provLocal = await prisma.proveedor.upsert({
          where: { rfc: rfcProv },
          update: {},
          create: {
            codigoProveedor: f.proveedor.codigoProveedor || null,
            rfc: rfcProv,
            nombre: f.proveedor.nombre || 'Proveedor',
            regimenFiscal: f.proveedor.regimenFiscal || '601',
          },
        });

        const yaExiste = await prisma.facturaXML.findUnique({ where: { uuid: f.uuid } });
        if (!yaExiste) {
          await prisma.facturaXML.create({
            data: {
              uuid: f.uuid,
              estado: f.estado || 'pendiente',
              serie: f.serie || null,
              folio: f.folio || null,
              fechaEmision: new Date(f.fechaEmision),
              subTotal: f.subTotal,
              total: f.total,
              metodoPago: f.metodoPago || 'PUE',
              formaPago: f.formaPago || null,
              usoCfdi: f.usoCfdi || 'G03',
              regimenReceptor: f.regimenReceptor || '624',
              condicionesPago: f.condicionesPago || null,
              diasCredito: f.diasCredito ?? null,
              estadoValidacion: f.estadoValidacion || 'Validada',
              fechaEstimadaPago: f.fechaEstimadaPago ? new Date(f.fechaEstimadaPago) : null,
              proveedorId: provLocal.id,
            },
          });
          facturasClonadas++;
        }
      }
      console.log(`   -> ${facturasClonadas} facturas XML clonadas en la nueva BD.`);
    }

    console.log('¡Clonación a la nueva base de datos independiente completada con éxito!');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error al clonar datos:', err);
  process.exit(1);
});
