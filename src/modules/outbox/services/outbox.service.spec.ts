import { Repository } from 'typeorm';
import { OutboxEvent } from '../entities';
import { OutboxEventStatus } from '../enums';
import { OutboxResolvedModuleOptions } from '../types';
import { OutboxService } from './outbox.service';

describe('OutboxService', () => {
  it('should return no events without querying when event types are empty', async () => {
    const manager = createManagerMock();
    const service = createService(createRepositoryMock({ manager }));

    await expect(service.claimPendingEventsByTypes([])).resolves.toEqual([]);
    expect(manager.transaction).not.toHaveBeenCalled();
  });

  it('should claim pending events with skip locked', async () => {
    const event = createOutboxEvent({ id: 'event-1' });
    const selectQueryBuilder = createQueryBuilderMock([
      'where',
      'andWhere',
      'orderBy',
      'limit',
      'setLock',
      'setOnLocked',
    ]);
    selectQueryBuilder.getMany = jest.fn().mockResolvedValue([event]);

    const updateQueryBuilder = createQueryBuilderMock([
      'update',
      'set',
      'whereInIds',
    ]);
    updateQueryBuilder.execute = jest.fn().mockResolvedValue({ affected: 1 });

    const manager = createManagerMock(selectQueryBuilder, updateQueryBuilder);
    const service = createService(createRepositoryMock({ manager }));

    await expect(
      service.claimPendingEvents('email.created', 25),
    ).resolves.toEqual([event]);

    expect(selectQueryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
    );
    expect(selectQueryBuilder.setOnLocked).toHaveBeenCalledWith('skip_locked');
    expect(updateQueryBuilder.set).toHaveBeenCalledWith({
      status: OutboxEventStatus.PROCESSING,
      processingStartedAt: expect.any(Date),
    });
    expect(event.status).toBe(OutboxEventStatus.PROCESSING);
    expect(event.processingStartedAt).toBeInstanceOf(Date);
  });

  it('should reset stale events by processing timestamp', async () => {
    const updateQueryBuilder = createQueryBuilderMock([
      'update',
      'set',
      'where',
      'andWhere',
    ]);
    updateQueryBuilder.execute = jest.fn().mockResolvedValue({ affected: 2 });

    const repository = createRepositoryMock({
      createQueryBuilder: jest.fn(() => updateQueryBuilder),
    });
    const service = createService(repository);

    await expect(service.resetStaleProcessingEvents(15)).resolves.toBe(2);

    expect(updateQueryBuilder.set).toHaveBeenCalledWith({
      status: OutboxEventStatus.PENDING,
      processingStartedAt: null,
    });
    expect(updateQueryBuilder.where).toHaveBeenCalledWith('status = :status', {
      status: OutboxEventStatus.PROCESSING,
    });
    expect(updateQueryBuilder.andWhere).toHaveBeenCalledWith(
      'processing_started_at < :staleThreshold',
      { staleThreshold: expect.any(Date) },
    );
  });

  it('should not mark an event as processed when its claim has expired', async () => {
    const updateQueryBuilder = createQueryBuilderMock([
      'update',
      'set',
      'where',
      'andWhere',
    ]);
    updateQueryBuilder.execute = jest.fn().mockResolvedValue({ affected: 0 });

    const repository = createRepositoryMock({
      createQueryBuilder: jest.fn(() => updateQueryBuilder),
    });
    const service = createService(repository);
    const expectedProcessingStartedAt = new Date('2026-05-22T12:00:00.000Z');

    await expect(
      service.markAsProcessed('event-1', expectedProcessingStartedAt),
    ).resolves.toBe(false);

    expect(updateQueryBuilder.where).toHaveBeenCalledWith('id = :eventId', {
      eventId: 'event-1',
    });
    expect(updateQueryBuilder.andWhere).toHaveBeenNthCalledWith(
      1,
      'status = :processingStatus',
      { processingStatus: OutboxEventStatus.PROCESSING },
    );
    expect(updateQueryBuilder.andWhere).toHaveBeenNthCalledWith(
      2,
      'processing_started_at = :expectedProcessingStartedAt',
      { expectedProcessingStartedAt },
    );
  });

  it('should mark a claimed event as processed', async () => {
    const updateQueryBuilder = createQueryBuilderMock([
      'update',
      'set',
      'where',
      'andWhere',
    ]);
    updateQueryBuilder.execute = jest.fn().mockResolvedValue({ affected: 1 });

    const repository = createRepositoryMock({
      createQueryBuilder: jest.fn(() => updateQueryBuilder),
    });
    const service = createService(repository);
    const expectedProcessingStartedAt = new Date('2026-05-22T12:00:00.000Z');

    await expect(
      service.markAsProcessed('event-1', expectedProcessingStartedAt),
    ).resolves.toBe(true);

    expect(updateQueryBuilder.set).toHaveBeenCalledWith({
      status: OutboxEventStatus.PROCESSED,
      processingStartedAt: null,
      processedAt: expect.any(Date),
    });
    expect(updateQueryBuilder.andWhere).toHaveBeenNthCalledWith(
      1,
      'status = :processingStatus',
      { processingStatus: OutboxEventStatus.PROCESSING },
    );
    expect(updateQueryBuilder.andWhere).toHaveBeenNthCalledWith(
      2,
      'processing_started_at = :expectedProcessingStartedAt',
      { expectedProcessingStartedAt },
    );
  });
});

type QueryBuilderMock = Record<string, jest.Mock>;

interface ManagerMock {
  createQueryBuilder: jest.Mock;
  findOne: jest.Mock;
  transaction: jest.Mock;
}

interface RepositoryMock {
  createQueryBuilder: jest.Mock;
  manager: ManagerMock;
}

function createService(repository: RepositoryMock): OutboxService {
  return new OutboxService(
    repository as unknown as Repository<OutboxEvent>,
    createOptions(),
  );
}

function createOptions(): OutboxResolvedModuleOptions {
  return {
    operationalPolicy: {
      claimBatchSize: 100,
      maxRetries: 5,
      staleProcessingMinutes: 5,
      resetStaleProcessingEvents: true,
      processedEventRetentionHours: 24,
    },
  };
}

function createRepositoryMock(
  overrides: Partial<RepositoryMock> = {},
): RepositoryMock {
  return {
    createQueryBuilder: jest.fn(),
    manager: createManagerMock(),
    ...overrides,
  };
}

function createManagerMock(...queryBuilders: QueryBuilderMock[]): ManagerMock {
  const manager: ManagerMock = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    transaction: jest.fn(),
  };

  manager.createQueryBuilder.mockImplementation(() => {
    const queryBuilder = queryBuilders.shift();

    if (!queryBuilder) {
      throw new Error('Unexpected query builder call.');
    }

    return queryBuilder;
  });

  manager.transaction.mockImplementation(
    async (callback: (manager: ManagerMock) => Promise<unknown>) =>
      callback(manager),
  );

  return manager;
}

function createQueryBuilderMock(methods: string[]): QueryBuilderMock {
  const queryBuilder: QueryBuilderMock = {};

  methods.forEach((method) => {
    queryBuilder[method] = jest.fn(() => queryBuilder);
  });

  return queryBuilder;
}

function createOutboxEvent(overrides: Partial<OutboxEvent>): OutboxEvent {
  return {
    id: 'event-id',
    eventType: 'event.type',
    payload: {},
    status: OutboxEventStatus.PENDING,
    retryCount: 0,
    lastError: null,
    createdAt: new Date('2026-05-22T10:00:00.000Z'),
    processingStartedAt: null,
    processedAt: null,
    ...overrides,
  };
}
