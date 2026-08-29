import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { AuthSessionResponse, LogoutResponse } from '@onedata/contracts';
import type { Request, Response } from 'express';
import { toApiEnvelope } from '../../common/http/api-envelope';
import { AuthSessionService } from '../auth/auth-session.service';
import { AuthGuard } from '../auth/auth.guard';
import { PortalExchangeDto } from '../dto/portal-exchange.dto';
import { PortalLaunchTokenService } from '../sso/portal-launch-token.service';

@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly sessions: AuthSessionService,
    private readonly portalTokens: PortalLaunchTokenService,
  ) {}

  @Post('portal/exchange')
  @HttpCode(HttpStatus.OK)
  async exchange(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() input: PortalExchangeDto,
  ) {
    const claims = await this.portalTokens.verify(input.token);
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
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessions.revokeFromRequest(request);
    this.sessions.clearSessionCookie(response);

    const data: LogoutResponse = { authenticated: false };
    return toApiEnvelope(data, request);
  }

  @Post('rotate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async rotate(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.sessions.rotateFromRequest(request);
    this.sessions.setSessionCookie(response, session);
    const data: AuthSessionResponse = {
      authenticated: true,
      user: session.user,
      expiresAt: session.expiresAt.toISOString(),
    };
    return toApiEnvelope(data, request);
  }
}
