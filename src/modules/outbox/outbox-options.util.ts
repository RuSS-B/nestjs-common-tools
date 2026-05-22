import {
  OutboxModuleOptions,
  OutboxResolvedModuleOptions,
  OutboxResolvedOperationalPolicy,
} from './types';

export const DEFAULT_OUTBOX_OPERATIONAL_POLICY: OutboxResolvedOperationalPolicy =
  {
    claimBatchSize: 100,
    maxRetries: 5,
    staleProcessingMinutes: 5,
    resetStaleProcessingEvents: true,
    processedEventRetentionHours: 24,
  };

export function resolveOutboxModuleOptions(
  options: OutboxModuleOptions = {},
): OutboxResolvedModuleOptions {
  const policy = options.operationalPolicy ?? {};
  const operationalPolicy: OutboxResolvedOperationalPolicy = {
    claimBatchSize: resolvePositiveNumber(
      policy.claimBatchSize,
      DEFAULT_OUTBOX_OPERATIONAL_POLICY.claimBatchSize,
    ),
    maxRetries: resolvePositiveNumber(
      policy.maxRetries,
      DEFAULT_OUTBOX_OPERATIONAL_POLICY.maxRetries,
    ),
    staleProcessingMinutes: resolvePositiveNumber(
      policy.staleProcessingMinutes,
      DEFAULT_OUTBOX_OPERATIONAL_POLICY.staleProcessingMinutes,
    ),
    resetStaleProcessingEvents:
      policy.resetStaleProcessingEvents ??
      DEFAULT_OUTBOX_OPERATIONAL_POLICY.resetStaleProcessingEvents,
    processedEventRetentionHours: resolvePositiveNumber(
      policy.processedEventRetentionHours,
      DEFAULT_OUTBOX_OPERATIONAL_POLICY.processedEventRetentionHours,
    ),
  };

  if (
    policy.maxConcurrentEvents !== undefined &&
    policy.maxConcurrentEvents > 0
  ) {
    operationalPolicy.maxConcurrentEvents = Math.floor(
      policy.maxConcurrentEvents,
    );
  }

  return { operationalPolicy };
}

function resolvePositiveNumber(
  value: number | undefined,
  fallback: number,
): number {
  if (value !== undefined && Number.isFinite(value) && value > 0) {
    return value;
  }

  return fallback;
}
