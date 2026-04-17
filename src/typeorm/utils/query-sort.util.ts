import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { SortOrder } from '../enums';

export type QueryOrderNulls = 'NULLS FIRST' | 'NULLS LAST';

export interface QuerySortConfig {
  column: string;
  nulls?: QueryOrderNulls;
  selectExpression?: string;
}

export interface QueryOrderByConfig extends QuerySortConfig {
  order: 'ASC' | 'DESC';
}

export type QuerySortMap<TSort extends string> = Record<TSort, QuerySortConfig>;

export function applyQuerySorting<
  TEntity extends ObjectLiteral,
  TSort extends string,
>(
  qb: SelectQueryBuilder<TEntity>,
  params: {
    sortBy?: TSort;
    sortOrder?: SortOrder;
    sortMap: QuerySortMap<TSort>;
    defaultSort: QuerySortConfig;
    tieBreakers?: QueryOrderByConfig[];
  },
): void {
  const primarySort = params.sortBy
    ? (params.sortMap[params.sortBy] ?? params.defaultSort)
    : params.defaultSort;
  const resolvedSortOrder = params.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
  const orderedColumns = new Set([primarySort.column]);

  if (primarySort.selectExpression) {
    qb.addSelect(primarySort.selectExpression, primarySort.column);
  }

  qb.orderBy(primarySort.column, resolvedSortOrder, primarySort.nulls);

  for (const tieBreaker of params.tieBreakers ?? []) {
    if (orderedColumns.has(tieBreaker.column)) {
      continue;
    }

    qb.addOrderBy(tieBreaker.column, tieBreaker.order, tieBreaker.nulls);
    orderedColumns.add(tieBreaker.column);
  }
}
