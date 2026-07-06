import { EntityManager, Repository } from 'typeorm';
import { OutboxEvent } from '../entities';
import { OutboxEventStatus } from '../enums';
import { OutboxResolvedModuleOptions } from '../types';
import { OutboxService } from './outbox.service';

describe('OutboxService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create an event with delayed processing and event retry limit', async () => {
    const nextTryAt = new Date('2026-05-22T12:00:05.000Z');
    const event = createOutboxEvent({
      eventType: 'order.reminder',
      payload: { orderId: 'order-1' },
      maxRetries: 3,
      nextTryAt,
    });
    const repository = createRepositoryMock({
      create: jest.fn(() => event),
      save: jest.fn().mockResolvedValue(event),
    });
    const service = createService(repository);

    await expect(
      service.createEvent(
        'order.reminder',
        { orderId: 'order-1' },
        { nextTryAt, maxRetries: 3 },
      ),
    ).resolves.toBe(event);

    expect(repository.create).toHaveBeenCalledWith({
      eventType: 'order.reminder',
      payload: { orderId: 'order-1' },
      status: OutboxEventStatus.PENDING,
      maxRetries: 3,
      nextTryAt,
    });
    expect(repository.save).toHaveBeenCalledWith(event);
  });

  it('should create an event with delayed processing from delay milliseconds', async () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-05-22T12:00:00.000Z').getTime());
    const nextTryAt = new Date('2026-05-22T12:00:05.000Z');
    const event = createOutboxEvent({
      eventType: 'order.reminder',
      payload: { orderId: 'order-1' },
      nextTryAt,
    });
    const repository = createRepositoryMock({
      create: jest.fn(() => event),
      save: jest.fn().mockResolvedValue(event),
    });
    const service = createService(repository);

    await expect(
      service.createEvent(
        'order.reminder',
        { orderId: 'order-1' },
        { delayMs: 5_000 },
      ),
    ).resolves.toBe(event);

    expect(repository.create).toHaveBeenCalledWith({
      eventType: 'order.reminder',
      payload: { orderId: 'order-1' },
      status: OutboxEventStatus.PENDING,
      maxRetries: null,
      nextTryAt,
    });
  });

  it('should create an event with transaction manager and default scheduling options', async () => {
    const event = createOutboxEvent({ id: 'event-1' });
    const transactionalRepository = createRepositoryMock({
      create: jest.fn(() => event),
      save: jest.fn().mockResolvedValue(event),
    });
    const manager = createManagerMock();
    manager.getRepository.mockReturnValue(transactionalRepository);
    const service = createService(createRepositoryMock());

    await expect(
      service.createEvent(
        'order.created',
        { orderId: 'order-1' },
        manager as unknown as EntityManager,
      ),
    ).resolves.toBe(event);

    expect(manager.getRepository).toHaveBeenCalledWith(OutboxEvent);
    expect(transactionalRepository.create).toHaveBeenCalledWith({
      eventType: 'order.created',
      payload: { orderId: 'order-1' },
      status: OutboxEventStatus.PENDING,
      maxRetries: null,
      nextTryAt: null,
    });
  });

  it('should reject non-integer event retry limit on create', async () => {
    const repository = createRepositoryMock();
    const service = createService(repository);

    await expect(
      service.createEvent('order.reminder', {}, { maxRetries: 2.5 }),
    ).rejects.toThrow('maxRetries must be a positive integer.');

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should reject delayed event with both next try time and delay milliseconds', async () => {
    const repository = createRepositoryMock();
    const service = createService(repository);

    await expect(
      service.createEvent(
        'order.reminder',
        {},
        {
          delayMs: 5_000,
          nextTryAt: new Date('2026-05-22T12:00:05.000Z'),
        },
      ),
    ).rejects.toThrow('delayMs cannot be used together with nextTryAt.');

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should reject non-integer delay milliseconds on create', async () => {
    const repository = createRepositoryMock();
    const service = createService(repository);

    await expect(
      service.createEvent('order.reminder', {}, { delayMs: 500.5 }),
    ).rejects.toThrow('delayMs must be a positive integer.');

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

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
    expect(selectQueryBuilder.andWhere).toHaveBeenNthCalledWith(
      2,
      '(outbox.next_try_at IS NULL OR outbox.next_try_at <= :now)',
      { now: expect.any(Date) },
    );
    expect(updateQueryBuilder.set).toHaveBeenCalledWith({
      status: OutboxEventStatus.PROCESSING,
      processingStartedAt: expect.any(Date),
      nextTryAt: null,
    });
    expect(event.status).toBe(OutboxEventStatus.PROCESSING);
    expect(event.processingStartedAt).toBeInstanceOf(Date);
    expect(event.nextTryAt).toBeNull();
  });

  it('should claim pending events by type only when next try time is due', async () => {
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
      service.claimPendingEventsByTypes(['email.created'], 25),
    ).resolves.toEqual([event]);

    expect(selectQueryBuilder.andWhere).toHaveBeenNthCalledWith(
      2,
      '(outbox.next_try_at IS NULL OR outbox.next_try_at <= :now)',
      { now: expect.any(Date) },
    );
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
      nextTryAt: null,
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
      nextTryAt: null,
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

  it('should use event retry limit before the fallback retry limit', async () => {
    const event = createOutboxEvent({
      id: 'event-1',
      retryCount: 1,
      maxRetries: 2,
    });
    const findQueryBuilder = createQueryBuilderMock(['where']);
    findQueryBuilder.getOne = jest.fn().mockResolvedValue(event);

    const updateQueryBuilder = createQueryBuilderMock([
      'update',
      'set',
      'where',
    ]);
    updateQueryBuilder.execute = jest.fn().mockResolvedValue({ affected: 1 });

    const repository = createRepositoryMock();
    repository.createQueryBuilder
      .mockReturnValueOnce(findQueryBuilder)
      .mockReturnValueOnce(updateQueryBuilder);
    const service = createService(repository);

    await expect(service.incrementRetry('event-1', 'boom', 5)).resolves.toBe(
      true,
    );

    expect(updateQueryBuilder.set).toHaveBeenCalledWith({
      status: OutboxEventStatus.FAILED,
      lastError: 'boom',
      retryCount: 2,
      processingStartedAt: null,
      nextTryAt: null,
    });
  });

  it('should reject non-integer persisted event retry limit', async () => {
    const event = createOutboxEvent({
      id: 'event-1',
      retryCount: 1,
      maxRetries: 2.5,
    });
    const findQueryBuilder = createQueryBuilderMock(['where']);
    findQueryBuilder.getOne = jest.fn().mockResolvedValue(event);

    const repository = createRepositoryMock();
    repository.createQueryBuilder.mockReturnValueOnce(findQueryBuilder);
    const service = createService(repository);

    await expect(service.incrementRetry('event-1', 'boom', 5)).rejects.toThrow(
      'event.maxRetries must be a positive integer.',
    );
  });

  it('should use fallback retry limit when event retry limit is not set', async () => {
    const event = createOutboxEvent({
      id: 'event-1',
      retryCount: 1,
      maxRetries: null,
    });
    const findQueryBuilder = createQueryBuilderMock(['where']);
    findQueryBuilder.getOne = jest.fn().mockResolvedValue(event);

    const updateQueryBuilder = createQueryBuilderMock([
      'update',
      'set',
      'where',
    ]);
    updateQueryBuilder.execute = jest.fn().mockResolvedValue({ affected: 1 });

    const repository = createRepositoryMock();
    repository.createQueryBuilder
      .mockReturnValueOnce(findQueryBuilder)
      .mockReturnValueOnce(updateQueryBuilder);
    const service = createService(repository);

    await expect(service.incrementRetry('event-1', 'boom', 2)).resolves.toBe(
      true,
    );

    expect(updateQueryBuilder.set).toHaveBeenCalledWith({
      status: OutboxEventStatus.FAILED,
      lastError: 'boom',
      retryCount: 2,
      processingStartedAt: null,
      nextTryAt: null,
    });
  });

  it('should store next retry time while retrying a failed event', async () => {
    const nextTryAt = new Date('2026-05-22T12:01:00.000Z');
    const event = createOutboxEvent({
      id: 'event-1',
      retryCount: 0,
      maxRetries: 3,
    });
    const findQueryBuilder = createQueryBuilderMock(['where']);
    findQueryBuilder.getOne = jest.fn().mockResolvedValue(event);

    const updateQueryBuilder = createQueryBuilderMock([
      'update',
      'set',
      'where',
    ]);
    updateQueryBuilder.execute = jest.fn().mockResolvedValue({ affected: 1 });

    const repository = createRepositoryMock();
    repository.createQueryBuilder
      .mockReturnValueOnce(findQueryBuilder)
      .mockReturnValueOnce(updateQueryBuilder);
    const service = createService(repository);

    await expect(
      service.incrementRetry('event-1', 'boom', 5, undefined, nextTryAt),
    ).resolves.toBe(true);

    expect(updateQueryBuilder.set).toHaveBeenCalledWith({
      status: OutboxEventStatus.PENDING,
      lastError: 'boom',
      retryCount: 1,
      processingStartedAt: null,
      nextTryAt,
    });
  });
});

type QueryBuilderMock = Record<string, jest.Mock>;

interface ManagerMock {
  createQueryBuilder: jest.Mock;
  findOne: jest.Mock;
  getRepository: jest.Mock;
  transaction: jest.Mock;
}

interface RepositoryMock {
  createQueryBuilder: jest.Mock;
  create: jest.Mock;
  manager: ManagerMock;
  save: jest.Mock;
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
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: createManagerMock(),
    save: jest.fn(),
    ...overrides,
  };
}

function createManagerMock(...queryBuilders: QueryBuilderMock[]): ManagerMock {
  const manager: ManagerMock = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    getRepository: jest.fn(),
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
    maxRetries: null,
    lastError: null,
    createdAt: new Date('2026-05-22T10:00:00.000Z'),
    processingStartedAt: null,
    nextTryAt: null,
    processedAt: null,
    ...overrides,
  };
}
