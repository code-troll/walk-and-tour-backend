interface RepositoryManagerMock<T> {
  transaction: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
  query: jest.Mock;
}

export interface RepositoryMock<_T> {
  find: jest.Mock;
  findOne: jest.Mock;
  findBy: jest.Mock;
  findAndCount: jest.Mock;
  count: jest.Mock;
  createQueryBuilder: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  manager: RepositoryManagerMock<_T>;
}

export function createRepositoryMock<T>(): RepositoryMock<T> {
  const manager: RepositoryManagerMock<T> = {
    transaction: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    query: jest.fn(),
  };

  manager.transaction.mockImplementation(async (callback: (manager: RepositoryManagerMock<T>) => unknown) =>
    callback(manager),
  );
  manager.find.mockImplementation(async () => []);
  manager.save.mockImplementation(async (_entityClass: unknown, value: T | T[]) => value);
  manager.query.mockResolvedValue(undefined);

  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findBy: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    create: jest.fn((value: Partial<T>) => value),
    save: jest.fn(async (value: T) => value),
    update: jest.fn(),
    delete: jest.fn(),
    manager,
  };
}
