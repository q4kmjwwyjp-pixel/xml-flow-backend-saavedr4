import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaNeon({
        connectionString: process.env.DATABASE_URL!,
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
    try {
      await this.$executeRawUnsafe(
        'ALTER TABLE "Proveedor" ADD COLUMN IF NOT EXISTS "codigoProveedor" TEXT;'
      );
    } catch (err) {
      console.warn('Aviso al verificar columna codigoProveedor:', err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
