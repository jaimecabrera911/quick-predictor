import { SupabaseRepository } from './supabase-repository';
import type { IDataRepository } from './repository';

export function createRepository(): IDataRepository {
  return new SupabaseRepository();
}
