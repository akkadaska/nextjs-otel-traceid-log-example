import { trace, context } from '@opentelemetry/api';

export function getIds() {
  // Get traceId and spanId from the current span
  const span = trace.getSpan(context.active());
  const  { traceId, spanId } = span?.spanContext() ?? { traceId: 'null', spanId: 'null' }
  return { traceId, spanId }
}