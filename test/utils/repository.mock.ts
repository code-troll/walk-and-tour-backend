export interface RepositoryMock<_T> {
  find: jest.Mock;
  findOne: jest.Mock;
  findBy: jest.Mock;
  findAndCount: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
}

export function createRepositoryMock<T>(): RepositoryMock<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findBy: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    create: jest.fn((value: Partial<T>) => value),
    save: jest.fn(async (value: T) => value),
    update: jest.fn(),
    delete: jest.fn(),
  };
}
