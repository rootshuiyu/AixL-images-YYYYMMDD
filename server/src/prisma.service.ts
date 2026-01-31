import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 使用环境变量中的 DATABASE_URL，检查空字符串
    const databaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0 
      ? process.env.DATABASE_URL 
      : 'postgresql://postgres:123456@localhost:5432/aixl_db?schema=public';
    
    console.log('[PrismaService] DATABASE_URL from env:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    console.log('[PrismaService] Using database URL:', databaseUrl.replace(/:[^:@]+@/, ':***@'));
    
    super({
      datasources: {
        db: {
          url: databaseUrl,
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

