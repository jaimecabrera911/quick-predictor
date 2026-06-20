import { SQLiteRepository } from './sqlite-repository';
import type { IDataRepository } from './repository';

export function createRepository(): IDataRepository {
  return new SQLiteRepository();
}
