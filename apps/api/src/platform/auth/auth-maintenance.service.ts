import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

const DEFAULT_AUTH_RETENTION_SECONDS = 30 * 24 * 60 * 60;

export interface AuthMaintenanceReport {
  authSessionsDeleted: number;
  portalLaunchReplaysDeleted: number;
}

/**
 * Removes expired authentication material without touching business audit
 * records. Run this from the restricted worker/maintenance process, never
 * from a public HTTP request.
 */
@Injectable()
export class AuthMaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async cleanupExpired(now = new Date()): Promise<AuthMaintenanceReport> {
    const revokedRetentionCutoff = new Date(
      now.getTime() - this.retentionSeconds() * 1_000,
    );
    const sessions = await this.prisma.authSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          { revokedAt: { lte: revokedRetentionCutoff } },
        ],
      },
    });
    const replays = await this.prisma.portalLaunchReplay.deleteMany({
      where: { expiresAt: { lte: now } },
    });

    return {
      authSessionsDeleted: sessions.count,
      portalLaunchReplaysDeleted: replays.count,
    };
  }

  private retentionSeconds(): number {
    const configured = Number(this.config.get<string>(
      'ONEDATA_AUTH_RETENTION_SECONDS',
      String(DEFAULT_AUTH_RETENTION_SECONDS),
    ));
    return Number.isInteger(configured) && configured > 0
      ? Math.min(configured, 365 * 24 * 60 * 60)
      : DEFAULT_AUTH_RETENTION_SECONDS;
  }
}
