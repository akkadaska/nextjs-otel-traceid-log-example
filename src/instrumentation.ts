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
