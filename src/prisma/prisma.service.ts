import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { OnModuleInit } from '@nestjs/common';
import { PrismaNeon } from '@prisma/adapter-neon';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            adapter: new PrismaNeon({
                connectionString: process.env.DATABASE_URL!
            })
        })
    }

    async onModuleInit() {
        this.$connect()
    }

    async onModuleDestroy() {
        this.$disconnect()
    }
}
