import { Inject, Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { OutboxEvent } from '../entities';
import { OutboxEventStatus } from '../enums';
import { OutboxResolvedModuleOptions } from '../types';
import {
  OUTBOX_EVENT_REPOSITORY,
  OUTBOX_MODULE_OPTIONS,
} from '../outbox.constants';

export interface CreateOutboxEventOptions {
  manager?: EntityManager;
  maxRetries?: number | null;
  nextTryAt?: Date | null;
}

@Injectable()
export class OutboxService {
  constructor(
    @Inject(OUTBOX_EVENT_REPOSITORY)
    private readonly outboxRepository: Repository<OutboxEvent>,
    @Inject(OUTBOX_MODULE_OPTIONS)
    private readonly options: OutboxResolvedModuleOptions,
  ) {}

  getOperationalPolicy(): OutboxResolvedModuleOptions['operationalPolicy'] {
    return this.options.operationalPolicy;
  }

  async createEvent(
    eventType: string,
    payload: Record<string, any>,
    optionsOrManager?: CreateOutboxEventOptions | EntityManager,
  ): Promise<OutboxEvent> {
    const options = this.resolveCreateEventOptions(optionsOrManager);
    const repo = options.manager
      ? options.manager.getRepository(OutboxEvent)
      : this.outboxRepository;

    const event = repo.create({
      eventType,
      payload,
      status: OutboxEventStatus.PENDING,
      maxRetries: this.resolveEventMaxRetries(options.maxRetries),
      nextTryAt: options.nextTryAt ?? null,
    });

    return repo.save(event);
  }

  async claimById(eventId: string): Promise<OutboxEvent | null> {
    return this.outboxRepository.manager.transaction(async (manager) => {
      const processingStartedAt = new Date();
      const query = manager
        .createQueryBuilder()
        .update(OutboxEvent)
        .set({
          status: OutboxEventStatus.PROCESSING,
          processingStartedAt,
          nextTryAt: null,
        })
        .where('id = :id', { id: eventId })
        .andWhere('status = :status', { status: OutboxEventStatus.PENDING });

      this.addReadyToProcessCondition(query, processingStartedAt);

      const result = await query.execute();

      if (!result.affected) {
        return null;
      }

      return manager.findOne(OutboxEvent, { where: { id: eventId } });
    });
  }

  async claimPendingEventsByTypes(
    eventTypes: string[],
    limit = this.options.operationalPolicy.claimBatchSize,
  ): Promise<OutboxEvent[]> {
    if (eventTypes.length === 0) {
      return [];
    }

    return this.outboxRepository.manager.transaction(async (manager) => {
      const query = manager
        .createQueryBuilder(OutboxEvent, 'outbox')
        .where('outbox.status = :status', { status: OutboxEventStatus.PENDING })
        .andWhere('outbox.eventType IN (:...eventTypes)', { eventTypes });

      this.addReadyToProcessCondition(query, new Date(), 'outbox');

      const events = await query
        .orderBy('outbox.createdAt', 'ASC')
        .limit(limit)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();

      if (events.length > 0) {
        const eventIds = events.map((e) => e.id);
        const processingStartedAt = new Date();
        await manager
          .createQueryBuilder()
          .update(OutboxEvent)
          .set({
            status: OutboxEventStatus.PROCESSING,
            processingStartedAt,
            nextTryAt: null,
          })
          .whereInIds(eventIds)
          .execute();

        events.forEach((e) => {
          e.status = OutboxEventStatus.PROCESSING;
          e.processingStartedAt = processingStartedAt;
          e.nextTryAt = null;
        });
      }

      return events;
    });
  }

  async claimPendingEvents(
    eventType: string,
    limit = this.options.operationalPolicy.claimBatchSize,
  ): Promise<OutboxEvent[]> {
    return this.outboxRepository.manager.transaction(async (manager) => {
      // Fetch pending events with pessimistic lock
      const query = manager
        .createQueryBuilder(OutboxEvent, 'outbox')
        .where('outbox.status = :status', { status: OutboxEventStatus.PENDING })
        .andWhere('outbox.eventType = :eventType', { eventType });

      this.addReadyToProcessCondition(query, new Date(), 'outbox');

      const events = await query
        .orderBy('outbox.createdAt', 'ASC')
        .limit(limit)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();

      // Immediately mark as PROCESSING while we hold the lock
      if (events.length > 0) {
        const eventIds = events.map((e) => e.id);
        const processingStartedAt = new Date();
        await manager
          .createQueryBuilder()
          .update(OutboxEvent)
          .set({
            status: OutboxEventStatus.PROCESSING,
            processingStartedAt,
            nextTryAt: null,
          })
          .whereInIds(eventIds)
          .execute();

        // Update the in-memory objects too
        events.forEach((e) => {
          e.status = OutboxEventStatus.PROCESSING;
          e.processingStartedAt = processingStartedAt;
          e.nextTryAt = null;
        });
      }

      return events;
    });
  }

  async markAsProcessing(eventId: string): Promise<void> {
    await this.outboxRepository.update(eventId, {
      status: OutboxEventStatus.PROCESSING,
      processingStartedAt: new Date(),
      nextTryAt: null,
    });
  }

  async markAsProcessed(
    eventId: string,
    expectedProcessingStartedAt?: Date | null,
  ): Promise<boolean> {
    return this.updateEvent(
      eventId,
      {
        status: OutboxEventStatus.PROCESSED,
        processingStartedAt: null,
        nextTryAt: null,
        processedAt: new Date(),
      },
      expectedProcessingStartedAt,
    );
  }

  async incrementRetry(
    eventId: string,
    error: string,
    fallbackMaxRetries = this.options.operationalPolicy.maxRetries,
    expectedProcessingStartedAt?: Date | null,
    nextTryAt?: Date | null,
  ): Promise<boolean> {
    const event = await this.findEventForProcessingUpdate(
      eventId,
      expectedProcessingStartedAt,
    );

    if (!event) {
      return false;
    }

    const newRetryCount = event.retryCount + 1;
    const maxRetries = this.resolveEffectiveMaxRetries(
      event.maxRetries,
      fallbackMaxRetries,
    );

    if (newRetryCount >= maxRetries) {
      return this.updateEvent(
        eventId,
        {
          status: OutboxEventStatus.FAILED,
          lastError: error,
          retryCount: newRetryCount,
          processingStartedAt: null,
          nextTryAt: null,
        },
        expectedProcessingStartedAt,
      );
    }

    return this.updateEvent(
      eventId,
      {
        status: OutboxEventStatus.PENDING,
        lastError: error,
        retryCount: newRetryCount,
        processingStartedAt: null,
        nextTryAt: nextTryAt ?? null,
      },
      expectedProcessingStartedAt,
    );
  }

  async markAsFailed(
    eventId: string,
    error: string,
    expectedProcessingStartedAt?: Date | null,
  ): Promise<boolean> {
    const event = await this.findEventForProcessingUpdate(
      eventId,
      expectedProcessingStartedAt,
    );

    return this.updateEvent(
      eventId,
      {
        status: OutboxEventStatus.FAILED,
        lastError: error,
        retryCount: event?.retryCount || 0,
        processingStartedAt: null,
        nextTryAt: null,
      },
      expectedProcessingStartedAt,
    );
  }

  async deleteProcessed(
    olderThanHours = this.options.operationalPolicy
      .processedEventRetentionHours,
  ): Promise<number> {
    const threshold = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const result = await this.outboxRepository
      .createQueryBuilder()
      .delete()
      .where('status = :status', { status: OutboxEventStatus.PROCESSED })
      .andWhere('processed_at < :threshold', { threshold })
      .execute();

    return result.affected || 0;
  }

  async resetStaleProcessingEvents(
    staleMinutes = this.options.operationalPolicy.staleProcessingMinutes,
  ): Promise<number> {
    const staleThreshold = new Date(Date.now() - staleMinutes * 60 * 1000);

    const result = await this.outboxRepository
      .createQueryBuilder()
      .update(OutboxEvent)
      .set({
        status: OutboxEventStatus.PENDING,
        processingStartedAt: null,
        nextTryAt: null,
      })
      .where('status = :status', { status: OutboxEventStatus.PROCESSING })
      .andWhere('processing_started_at < :staleThreshold', { staleThreshold })
      .execute();

    return result.affected || 0;
  }

  private async findEventForProcessingUpdate(
    eventId: string,
    expectedProcessingStartedAt?: Date | null,
  ): Promise<OutboxEvent | null> {
    const query = this.outboxRepository
      .createQueryBuilder('outbox')
      .where('outbox.id = :eventId', { eventId });

    this.addProcessingOwnershipCondition(query, expectedProcessingStartedAt);

    return query.getOne();
  }

  private async updateEvent(
    eventId: string,
    values: Partial<OutboxEvent>,
    expectedProcessingStartedAt?: Date | null,
  ): Promise<boolean> {
    const query = this.outboxRepository
      .createQueryBuilder()
      .update(OutboxEvent)
      .set(values)
      .where('id = :eventId', { eventId });

    this.addProcessingOwnershipCondition(query, expectedProcessingStartedAt);

    const result = await query.execute();

    return Boolean(result.affected);
  }

  private addProcessingOwnershipCondition(
    query: {
      andWhere: (
        where: string,
        parameters?: Record<string, unknown>,
      ) => unknown;
    },
    expectedProcessingStartedAt?: Date | null,
  ): void {
    if (expectedProcessingStartedAt === undefined) {
      return;
    }

    query.andWhere('status = :processingStatus', {
      processingStatus: OutboxEventStatus.PROCESSING,
    });

    if (expectedProcessingStartedAt === null) {
      query.andWhere('processing_started_at IS NULL');

      return;
    }

    query.andWhere('processing_started_at = :expectedProcessingStartedAt', {
      expectedProcessingStartedAt,
    });
  }

  private addReadyToProcessCondition(
    query: {
      andWhere: (
        where: string,
        parameters?: Record<string, unknown>,
      ) => unknown;
    },
    now: Date,
    alias?: string,
  ): void {
    const prefix = alias ? `${alias}.` : '';

    query.andWhere(
      `(${prefix}next_try_at IS NULL OR ${prefix}next_try_at <= :now)`,
      { now },
    );
  }

  private resolveCreateEventOptions(
    optionsOrManager?: CreateOutboxEventOptions | EntityManager,
  ): CreateOutboxEventOptions {
    if (!optionsOrManager) {
      return {};
    }

    if (this.isEntityManager(optionsOrManager)) {
      return { manager: optionsOrManager };
    }

    return optionsOrManager;
  }

  private isEntityManager(
    value: CreateOutboxEventOptions | EntityManager,
  ): value is EntityManager {
    return typeof (value as EntityManager).getRepository === 'function';
  }

  private resolveEventMaxRetries(maxRetries?: number | null): number | null {
    if (maxRetries === undefined || maxRetries === null) {
      return null;
    }

    return this.requirePositiveInteger(maxRetries, 'maxRetries');
  }

  private resolveEffectiveMaxRetries(
    eventMaxRetries: number | null,
    fallbackMaxRetries: number,
  ): number {
    if (eventMaxRetries !== null) {
      return this.requirePositiveInteger(eventMaxRetries, 'event.maxRetries');
    }

    return this.requirePositiveInteger(
      fallbackMaxRetries,
      'fallbackMaxRetries',
    );
  }

  private requirePositiveInteger(value: number, optionName: string): number {
    if (Number.isInteger(value) && value > 0) {
      return value;
    }

    throw new TypeError(`${optionName} must be a positive integer.`);
  }
}
