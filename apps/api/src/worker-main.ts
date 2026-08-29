import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LeaveSnapshotWorkerService } from './worker/leave-snapshot-worker.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  const worker = app.get(LeaveSnapshotWorkerService);
  const once = process.argv.includes('--once');

  if (!once && !worker.isEnabled()) {
    console.log('One Data worker is disabled (set ONEDATA_WORKER_ENABLED=true to run it).');
    await app.close();
    return;
  }

  let running = false;
  const run = async (): Promise<boolean> => {
    if (running) {
      return true;
    }
    running = true;
    try {
      console.log(JSON.stringify(await worker.runOnce()));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      running = false;
    }
  };

  const firstRunSucceeded = await run();
  if (once) {
    await app.close();
    if (!firstRunSucceeded) {
      process.exitCode = 1;
    }
    return;
  }

  const interval = setInterval(() => { void run(); }, worker.intervalMs());
  const shutdown = async (): Promise<void> => {
    clearInterval(interval);
    await app.close();
  };
  process.once('SIGTERM', () => { void shutdown(); });
  process.once('SIGINT', () => { void shutdown(); });
}

void bootstrap();
