import env from '../config/env';
import { PaginationQuery } from '../types';

export const getPaginationParams = (query: any): Required<PaginationQuery> => {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(
    env.MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.limit as string, 10) || env.DEFAULT_PAGE_SIZE)
  );
  const sortBy = (query.sortBy as string) || 'createdAt';
  const sortOrder = (query.sortOrder as 'asc' | 'desc') === 'asc' ? 'asc' : 'desc';

  return { page, limit, sortBy, sortOrder };
};

export const getSkipTake = (page: number, limit: number) => {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
};
