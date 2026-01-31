import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 使用环境变量中的 DATABASE_URL
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/aixl_db?schema=public',
        },
      },
    });
  }

  async onModuleInit() {
    this.logger.log(`Prisma connecting to database (Direct Link)...`);
    try {
      await this.$connect();
      this.logger.log('Prisma connected successfully.');
    } catch (e) {
      this.logger.error('Prisma connection failed!', e);
    }
  }
  
  private readonly logger = new Logger(PrismaService.name);

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

