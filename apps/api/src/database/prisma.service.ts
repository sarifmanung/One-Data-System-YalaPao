import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly databaseConfigured: boolean;

  constructor(config: ConfigService) {
    const databaseUrl = config.get<string>('DATABASE_URL');
    super(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined);
    this.databaseConfigured = Boolean(databaseUrl);
  }

  isDatabaseConfigured(): boolean {
    return this.databaseConfigured;
  }

  async onModuleInit(): Promise<void> {
    if (this.databaseConfigured) {
      await this.$connect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
