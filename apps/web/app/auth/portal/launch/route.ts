import { NextRequest, NextResponse } from 'next/server';

function dashboardUrl(request: NextRequest): URL {
  const publicWebUrl = process.env.ONEDATA_PUBLIC_WEB_URL;
  return new URL('/tenant-dashboard', publicWebUrl || request.url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(dashboardUrl(request));
  }

  const apiUrl = process.env.ONEDATA_API_URL ?? 'http://localhost:3100';
  let exchange: Response;

  try {
    exchange = await fetch(`${apiUrl}/api/v1/auth/portal/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.redirect(dashboardUrl(request));
  }

  const response = NextResponse.redirect(dashboardUrl(request));
  const setCookie = exchange.headers.get('set-cookie');
  if (exchange.ok && setCookie) {
    // The browser sees the web app as its origin. Forward only the API's
    // session cookie; the launch token and exchange body never reach it.
    response.headers.set('set-cookie', setCookie);
  }

  return response;
}
