import { createContext, useContext, type ReactNode } from 'react';
import type { IDataRepository } from './repository';
import { createRepository } from './repo-factory';

const RepositoryContext = createContext<IDataRepository | null>(null);

let repoInstance: IDataRepository | null = null;

export function getRepository(): IDataRepository {
  if (!repoInstance) {
    repoInstance = createRepository();
  }
  return repoInstance;
}

export async function initDatabase(): Promise<void> {
  const repo = getRepository();
  await repo.init();
}

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const repo = getRepository();
  return (
    <RepositoryContext.Provider value={repo}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepository(): IDataRepository {
  const ctx = useContext(RepositoryContext);
  if (!ctx) throw new Error('useRepository must be used within RepositoryProvider');
  return ctx;
}
