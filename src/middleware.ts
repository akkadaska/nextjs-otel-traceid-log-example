import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // Generate traceparent header
  // This is necessary because:
  // 1. Middleware runs on edge runtime where OpenTelemetry spans are not yet generated
  // 2. We need to ensure tracing continuity from the edge to the application
  // Note: If upstream services (e.g., Load Balancer, API Gateway) already set the traceparent header,
  // this generation step may be unnecessary
  const {
    traceParent,
    traceId,
    spanId,
  } = generateTraceParent();

  // Log request details including tracing information for debugging and monitoring purposes
  console.info(`[Request log from middleware]\ttraceId=${traceId}\tspanId=${spanId}\tmethod=${req.method}\turl=${req.url}`);

  const headers = new Headers(req.headers);
  headers.set('traceparent', traceParent);

  return NextResponse.next({
    ...req,
    headers,
  });
}

export const config = {
  matcher: "/((?!static|.*\\..*|_next).*)",
}

function generateTraceParent() {
  // Generate traceparent according to W3C Trace Context specification
  // Reference: https://www.w3.org/TR/trace-context/
  // Using Web Crypto API as Node.js crypto module is not available in edge runtime
  const version = new Uint8Array([0]);
  const versionHex = toHex(version);

  const traceId = new Uint8Array(16);
  crypto.getRandomValues(traceId);
  const traceIdHex = toHex(traceId);

  const spanId = new Uint8Array(8);
  crypto.getRandomValues(spanId);
  const spanIdHex = toHex(spanId);

  const flags = '01';

  const traceParent = `${versionHex}-${traceIdHex}-${spanIdHex}-${flags}`;

  return {
    traceParent,
    traceId: traceIdHex,
    spanId: spanIdHex,
  
  }
}

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
