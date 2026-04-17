import { SortOrder } from '../enums';
import { applyQuerySorting } from './query-sort.util';

function createListQueryBuilderMock() {
  return {
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    addSelect: jest.fn(),
  };
}

describe('applyQuerySorting', () => {
  it('applies default sorting with tie breakers', () => {
    const qb = createListQueryBuilderMock();

    applyQuerySorting(qb as never, {
      sortMap: {
        name: {
          column: 'c.name',
        },
      },
      defaultSort: {
        column: 'c.createdAt',
      },
      tieBreakers: [
        {
          column: 'c.createdAt',
          order: 'DESC',
        },
        {
          column: 'c.id',
          order: 'DESC',
        },
      ],
    });

    expect(qb.orderBy).toHaveBeenCalledWith('c.createdAt', 'DESC', undefined);
    expect(qb.addOrderBy).toHaveBeenCalledTimes(1);
    expect(qb.addOrderBy).toHaveBeenCalledWith('c.id', 'DESC', undefined);
  });

  it('applies requested sorting and keeps deterministic tie breakers', () => {
    const qb = createListQueryBuilderMock();

    applyQuerySorting(qb as never, {
      sortBy: 'name',
      sortOrder: SortOrder.ASC,
      sortMap: {
        name: {
          column: 'c.name',
        },
      },
      defaultSort: {
        column: 'c.createdAt',
      },
      tieBreakers: [
        {
          column: 'c.createdAt',
          order: 'DESC',
        },
        {
          column: 'c.id',
          order: 'DESC',
        },
      ],
    });

    expect(qb.orderBy).toHaveBeenCalledWith('c.name', 'ASC', undefined);
    expect(qb.addOrderBy).toHaveBeenNthCalledWith(
      1,
      'c.createdAt',
      'DESC',
      undefined,
    );
    expect(qb.addOrderBy).toHaveBeenNthCalledWith(2, 'c.id', 'DESC', undefined);
  });

  it('adds computed select expressions before sorting by their alias', () => {
    const qb = createListQueryBuilderMock();

    applyQuerySorting(qb as never, {
      sortBy: 'lastUpdated',
      sortMap: {
        lastUpdated: {
          column: 'candidate_last_updated_sort',
          nulls: 'NULLS LAST',
          selectExpression: 'COALESCE(c.updated_at, c.created_at)',
        },
      },
      defaultSort: {
        column: 'c.createdAt',
      },
    });

    expect(qb.addSelect).toHaveBeenCalledWith(
      'COALESCE(c.updated_at, c.created_at)',
      'candidate_last_updated_sort',
    );
    expect(qb.orderBy).toHaveBeenCalledWith(
      'candidate_last_updated_sort',
      'DESC',
      'NULLS LAST',
    );
  });
});
