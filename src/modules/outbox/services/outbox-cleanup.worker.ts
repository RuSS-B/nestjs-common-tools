import { Injectable, Logger } from '@nestjs/common';
import { OutboxService } from './outbox.service';

@Injectable()
export class OutboxCleanupWorker {
  private readonly logger = new Logger(OutboxCleanupWorker.name);
  private locked = false;

  constructor(private readonly outboxService: OutboxService) {}

  async cleanupProcessedEvents(
    retentionHours = this.outboxService.getOperationalPolicy()
      .processedEventRetentionHours,
  ): Promise<number> {
    if (this.locked) {
      this.logger.warn('Outbox cleanup is still running');

      return 0;
    }

    this.locked = true;

    try {
      const resolvedRetentionHours = this.resolveRetentionHours(retentionHours);
      const deletedCount = await this.outboxService.deleteProcessed(
        resolvedRetentionHours,
      );

      if (deletedCount > 0) {
        this.logger.log(
          `Deleted ${deletedCount} processed outbox events older than ${resolvedRetentionHours}h`,
        );
      }

      return deletedCount;
    } catch (error: unknown) {
      this.logger.error('Outbox cleanup failed', error);

      return 0;
    } finally {
      this.locked = false;
    }
  }

  private resolveRetentionHours(retentionHours: number): number {
    if (Number.isFinite(retentionHours) && retentionHours > 0) {
      return retentionHours;
    }

    const fallbackRetentionHours =
      this.outboxService.getOperationalPolicy().processedEventRetentionHours;

    this.logger.warn(
      `Invalid outbox processed-event retention ${retentionHours}; using ${fallbackRetentionHours}h`,
    );

    return fallbackRetentionHours;
  }
}
