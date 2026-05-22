import {
  OutboxModuleOptions,
  OutboxResolvedModuleOptions,
  OutboxResolvedOperationalPolicy,
} from './interfaces';

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
    claimBatchSize:
      policy.claimBatchSize ?? DEFAULT_OUTBOX_OPERATIONAL_POLICY.claimBatchSize,
    maxRetries:
      policy.maxRetries ?? DEFAULT_OUTBOX_OPERATIONAL_POLICY.maxRetries,
    staleProcessingMinutes:
      policy.staleProcessingMinutes ??
      DEFAULT_OUTBOX_OPERATIONAL_POLICY.staleProcessingMinutes,
    resetStaleProcessingEvents:
      policy.resetStaleProcessingEvents ??
      DEFAULT_OUTBOX_OPERATIONAL_POLICY.resetStaleProcessingEvents,
    processedEventRetentionHours:
      policy.processedEventRetentionHours ??
      DEFAULT_OUTBOX_OPERATIONAL_POLICY.processedEventRetentionHours,
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
