import { AdminSeederService } from './admin-seeder.service';
describe('AdminSeederService deployment safety', () => {
  it('does not change an existing admin password or status during startup', async () => {
    const admin = { role: 'super_admin', status: 'suspended', passwordHash: 'unchanged' };
    const repository = { findOne: jest.fn().mockResolvedValue(admin), save: jest.fn() };
    const service = new AdminSeederService(repository as any, { get: jest.fn().mockReturnValue('configured') } as any);
    await service.onModuleInit();
    expect(repository.save).not.toHaveBeenCalled();
    expect(admin).toMatchObject({ status: 'suspended', passwordHash: 'unchanged' });
  });
  it('does not create a default-password admin without explicit configuration', async () => {
    const repository = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn(), create: jest.fn() };
    const service = new AdminSeederService(repository as any, { get: jest.fn() } as any);
    await service.onModuleInit();
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
});
