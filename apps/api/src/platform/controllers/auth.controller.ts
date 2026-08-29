import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { AuthSessionResponse, LogoutResponse } from '@onedata/contracts';
import type { Request, Response } from 'express';
import { toApiEnvelope } from '../../common/http/api-envelope';
import { AuthSessionService } from '../auth/auth-session.service';
import { PortalExchangeDto } from '../dto/portal-exchange.dto';
import { PortalLaunchTokenService } from '../sso/portal-launch-token.service';

@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly sessions: AuthSessionService,
    private readonly portalTokens: PortalLaunchTokenService,
  ) {}

  @Post('portal/exchange')
  async exchange(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() input: PortalExchangeDto,
  ) {
    const claims = this.portalTokens.verify(input.token);
    const session = await this.sessions.createFromPortalClaims(claims);
    this.sessions.setSessionCookie(response, session);

    const data: AuthSessionResponse = {
      authenticated: true,
      user: session.user,
      expiresAt: session.expiresAt.toISOString(),
    };
    return toApiEnvelope(data, request);
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessions.revokeFromRequest(request);
    this.sessions.clearSessionCookie(response);

    const data: LogoutResponse = { authenticated: false };
    return toApiEnvelope(data, request);
  }
}
