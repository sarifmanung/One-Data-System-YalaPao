import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/http/problem-details.filter';
import { parseTrustProxy } from './common/http/trusted-proxy';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const configuredOrigins = config.get<string>('CORS_ORIGIN', '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cookieParser());
  app.set('trust proxy', parseTrustProxy(config.get<string>('ONEDATA_TRUST_PROXY')));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: configuredOrigins.length > 0 ? configuredOrigins : true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 3100);
  await app.listen(port, '0.0.0.0');
  console.log(`One Data API listening on ${port}`);
}

void bootstrap();
