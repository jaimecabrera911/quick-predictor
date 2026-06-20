import { WebRepository } from './web-repository';
import type { IDataRepository } from './repository';

export function createRepository(): IDataRepository {
  return new WebRepository();
}
