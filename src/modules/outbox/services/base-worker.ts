import { Injectable, Logger } from '@nestjs/common';
import { OutboxService } from '../services';
import { OutboxEvent } from '../entities';
import { OutboxResolvedOperationalPolicy } from '../types';

@Injectable()
export abstract class BaseWorker {
  private readonly logger = new Logger(BaseWorker.name);
  private locked: boolean;

  protected constructor(protected readonly outboxService: OutboxService) {}

  abstract getEvents(): Promise<OutboxEvent[]>;

  async work(): Promise<void> {
    if (this.locked) {
      this.logger.warn('The resource is locked because it is still in process');

      return;
    }

    this.locked = true;

    try {
      const policy = this.outboxService.getOperationalPolicy();

      if (policy.resetStaleProcessingEvents) {
        const resetCount = await this.outboxService.resetStaleProcessingEvents(
          policy.staleProcessingMinutes,
        );
        if (resetCount > 0) {
          this.logger.warn(`Reset ${resetCount} stale processing events`);
        }
      }

      // Claim events (fetches + marks as PROCESSING in one transaction)
      const events = await this.getEvents();

      if (events.length > 0) {
        this.logger.debug(`Got ${events.length} pending events`);
      }

      await this.processEvents(events, policy);
    } catch (e: unknown) {
      this.logger.error('Worker cycle failed', e);
    } finally {
      this.locked = false;
    }
  }

  private async processEvents(
    events: OutboxEvent[],
    policy: OutboxResolvedOperationalPolicy,
  ): Promise<void> {
    if (!policy.maxConcurrentEvents) {
      await Promise.allSettled(
        events.map((event) => this.processEvent(event, policy.maxRetries)),
      );

      return;
    }

    for (let i = 0; i < events.length; i += policy.maxConcurrentEvents) {
      const batch = events.slice(i, i + policy.maxConcurrentEvents);
      await Promise.allSettled(
        batch.map((event) => this.processEvent(event, policy.maxRetries)),
      );
    }
  }

  private async processEvent(
    event: OutboxEvent,
    maxRetries: number,
  ): Promise<void> {
    try {
      await this.handle(event);

      const markedAsProcessed = await this.outboxService.markAsProcessed(
        event.id,
        event.processingStartedAt,
      );

      if (markedAsProcessed) {
        this.logger.log(`Successfully processed event ${event.id}`);
      } else {
        this.logger.warn(
          `Event ${event.id} was processed but not marked as processed because the claim expired`,
        );
      }
    } catch (e: unknown) {
      this.logger.error(`Failed to process event ${event.id}`, e);
      const errorMessage = this.getErrorMessage(e);

      const retryUpdated = await this.outboxService.incrementRetry(
        event.id,
        errorMessage,
        maxRetries,
        event.processingStartedAt,
      );

      if (!retryUpdated) {
        this.logger.warn(
          `Event ${event.id} retry was not updated because the claim expired`,
        );
      }
    }
  }

  private getErrorMessage(e: unknown): string {
    if (e instanceof Error) {
      return e.message;
    }

    return String(e);
  }

  abstract handle(event: OutboxEvent): Promise<void>;
}
