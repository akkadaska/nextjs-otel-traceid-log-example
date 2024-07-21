# Next.js OpenTelemetry TraceID Integration Example

This project demonstrates how to integrate OpenTelemetry with a Next.js application to implement distributed tracing across various environments, including edge runtime.

## Goals
The goal of this project is to implement distributed tracing in a Next.js application using OpenTelemetry, enabling seamless tracing across different components including middleware, server, and external API calls. This setup aims to provide a clear visualization of request flow and improve debugging capabilities like this:

Next.js server logs:
```
[Request log from middleware]   traceId=dd19a611e9ecea7586020b7ec57566d0        spanId=5b34ec95e459d3f7    method=GET      url=http://localhost:3000/
[Log from page.tsx]     traceId=dd19a611e9ecea7586020b7ec57566d0        spanId=4071e3a0361e58a2    Fetching external API
[Log from layout.tsx]   traceId=dd19a611e9ecea7586020b7ec57566d0        spanId=4071e3a0361e58a
```

External API server logs:
```
External API is called with traceparent on headers: 00-dd19a611e9ecea7586020b7ec57566d0-64b4b376938fc984-01
```

## Features

- OpenTelemetry integration with Next.js using [@vercel/otel](https://www.npmjs.com/package/@vercel/otel)
- Custom instrumentation for Next.js's `fetch` function using [@opentelemetry/instrumentation-undici](https://www.npmjs.com/package/@opentelemetry/instrumentation-undici)
- Traceparent header generation in edge runtime (middleware)
- Distributed tracing across Next.js server
- Logging with trace and span IDs for improved debugging and monitoring

Note: Currently, Route Handler on edge runtime does not support OpenTelemetry instrumentation in this way.

## Try it out

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the Next.js application:
   ```
   npm run dev
   # or
   npm run build && npm start
   ```
4. Start the external API server (for testing distributed tracing):
   ```
   npm run external-api
   ```

## How to implement
Here are the steps to implement OpenTelemetry in a Next.js application:
### Setup OpenTelemetry
Following the [OpenTelemetry Guide on Next.js](https://nextjs.org/docs/app/building-your-application/optimizing/open-telemetry), but with a few modifications.

#### Enable `instrumentationHook` in `next.config.js`
As mentioned in the official guide, you need to make `experimental.instrumentationHook = true` in `next.config.js` to enable opt-in experimental features.

#### Install dependencies
```bash
npm install @vercel/otel @opentelemetry/api @opentelemetry/instrumentation-undici
```
[@opentelemetry/api](https://www.npmjs.com/package/@opentelemetry/api) and [@opentelemetry/instrumentation-undici](https://www.npmjs.com/package/@opentelemetry/instrumentation-undici) are additional dependencies for custom instrumentation.

#### Setup instrumentation
To trace `fetch` calls in Next.js, you need to add `UndiciInstrumentation` to the OpenTelemetry provider. However, this instrumentation works only Node.js runtime, not in the edge runtime. So, you need to create `instrumentation.node.ts` in the root directory of the project (or inside src folder if using one):

```ts
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';

export function getInstrumentations() {
  // UndiciInstrumentation adds traceparent headers to outgoing requests
  // This enables distributed tracing for Next.js's fetch function
  // For more details: https://www.npmjs.com/package/@opentelemetry/instrumentation-undici
  return [new UndiciInstrumentation()];
}
```

Then, register this instrumentation in the OpenTelemetry provider. Create `instrumentation.node.ts` also in the root directory of the project (or inside src folder if using one):

```ts
import { registerOTel } from '@vercel/otel';

export async function register() {
  // Ensure that custom instrumentations are only imported in the Node.js runtime
  // https://github.com/open-telemetry/opentelemetry-js/issues/4297
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getInstrumentations } = await import('./instrumentation.node.ts');

    registerOTel({
      serviceName:'next-app',
      instrumentations: getInstrumentations()
    })
  }
}
```

#### Generate traceparent header and log request details in middleware
```ts
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
```

#### Get trace and span IDs in the Server Component, Server Action and Route Handler (only Node.js runtime)
```ts
// create a function to get traceId and spanIdq
import { trace, context } from '@opentelemetry/api';

export function getIds() {
  // Get traceId and spanId from the current span
  const span = trace.getSpan(context.active());
  const  { traceId, spanId } = span?.spanContext() ?? { traceId: 'null', spanId: 'null' }
  return { traceId, spanId }
}
```

## License

This project is dedicated to the public domain under the Unlicense. Feel free to use, modify, and distribute the code without any restrictions or attribution requirements.
