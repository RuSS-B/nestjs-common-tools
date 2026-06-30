import { Logger } from '@nestjs/common';
import { OutboxEvent } from '../entities';
import { OutboxEventStatus } from '../enums';
import { OutboxResolvedOperationalPolicy } from '../types';
import { BaseWorker } from './base-worker';
import { OutboxService } from './outbox.service';

describe('BaseWorker', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should pass worker next retry time to outbox service on handler failure', async () => {
    const processingStartedAt = new Date('2026-05-22T12:00:00.000Z');
    const nextTryAt = new Date('2026-05-22T12:01:00.000Z');
    const error = new Error('handler failed');
    const event = createOutboxEvent({
      id: 'event-1',
      retryCount: 1,
      processingStartedAt,
    });
    const outboxService = createOutboxServiceMock();
    const worker = new TestWorker(outboxService, [event], error, nextTryAt);

    await worker.work();

    expect(worker.getNextTryAtCalls).toEqual([
      {
        event,
        error,
        nextRetryCount: 2,
      },
    ]);
    expect(outboxService.incrementRetry).toHaveBeenCalledWith(
      'event-1',
      'handler failed',
      5,
      processingStartedAt,
      nextTryAt,
    );
  });
});

class TestWorker extends BaseWorker {
  readonly getNextTryAtCalls: Array<{
    event: OutboxEvent;
    error: unknown;
    nextRetryCount: number;
  }> = [];

  constructor(
    outboxService: OutboxService,
    private readonly events: OutboxEvent[],
    private readonly error: Error,
    private readonly nextTryAt: Date,
  ) {
    super(outboxService);
  }

  getEvents(): Promise<OutboxEvent[]> {
    return Promise.resolve(this.events);
  }

  handle(): Promise<void> {
    throw this.error;
  }

  protected getNextTryAt(
    event: OutboxEvent,
    error: unknown,
    nextRetryCount: number,
  ): Date | null {
    this.getNextTryAtCalls.push({ event, error, nextRetryCount });

    return this.nextTryAt;
  }
}

function createOutboxServiceMock(): OutboxService {
  return {
    getOperationalPolicy: jest.fn((): OutboxResolvedOperationalPolicy => {
      return {
        claimBatchSize: 100,
        maxRetries: 5,
        staleProcessingMinutes: 5,
        resetStaleProcessingEvents: false,
        processedEventRetentionHours: 24,
      };
    }),
    incrementRetry: jest.fn().mockResolvedValue(true),
    markAsProcessed: jest.fn().mockResolvedValue(true),
    resetStaleProcessingEvents: jest.fn().mockResolvedValue(0),
  } as unknown as OutboxService;
}

function createOutboxEvent(overrides: Partial<OutboxEvent>): OutboxEvent {
  return {
    id: 'event-id',
    eventType: 'event.type',
    payload: {},
    status: OutboxEventStatus.PROCESSING,
    retryCount: 0,
    maxRetries: null,
    lastError: null,
    createdAt: new Date('2026-05-22T10:00:00.000Z'),
    processingStartedAt: null,
    nextTryAt: null,
    processedAt: null,
    ...overrides,
  };
}
