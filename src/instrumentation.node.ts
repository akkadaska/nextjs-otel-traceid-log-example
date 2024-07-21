import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';

export function getInstrumentations() {
  // UndiciInstrumentation adds traceparent headers to outgoing requests
  // This enables distributed tracing for Next.js's fetch function
  // For more details: https://www.npmjs.com/package/@opentelemetry/instrumentation-undici
  return [new UndiciInstrumentation()];
}

