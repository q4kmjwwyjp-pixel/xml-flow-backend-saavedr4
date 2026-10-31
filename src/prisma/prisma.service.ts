import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
    try {
      await this.$executeRawUnsafe(
        'ALTER TABLE "Proveedor" ADD COLUMN IF NOT EXISTS "codigoProveedor" TEXT;'
      );
      await this.$executeRawUnsafe(
        'ALTER TABLE "FacturaXML" ADD COLUMN IF NOT EXISTS "folioContrarrecibo" TEXT;'
      );
      await this.$executeRawUnsafe(
        'ALTER TABLE "FacturaXML" ADD COLUMN IF NOT EXISTS "moneda" TEXT NOT NULL DEFAULT \'MXN\';'
      );
    } catch (err) {
      console.warn('Aviso al verificar columnas en base de datos:', err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
