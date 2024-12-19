import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTenantDto } from '../create-tenant.dto';
import { TenantDatabaseDto } from '../tenant-database.dto';

describe('CreateTenantDto', () => {
  it('should validate and transform the database field into TenantDatabaseDto', async () => {
    const input = {
      name: 'Test Tenant',
      slug: 'test-tenant',
      isEnabled: true,
      database: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        username: 'admin',
        password: 'password123',
        certificate: null,
      },
    };

    const transformed = plainToInstance(CreateTenantDto, input);

    expect(transformed.database).toBeInstanceOf(TenantDatabaseDto);
    expect(transformed.database.host).toEqual('localhost');
    expect(transformed.database.port).toEqual(5432);

    const errors = await validate(transformed);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation if database is not valid', async () => {
    const input = {
      name: 'Test Tenant',
      slug: 'test-tenant',
      isEnabled: true,
      database: {
        host: '',
        port: null,
        database: '',
        username: '',
        password: '',
      },
    };

    const transformed = plainToInstance(CreateTenantDto, input);
    const errors = await validate(transformed);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toEqual('database');
    expect(errors[0].children).toBeDefined();

    const databaseErrors = errors[0].children;
    expect(databaseErrors).toBeDefined();
    expect(databaseErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: {
            host: '',
            port: null,
            database: '',
            username: '',
            password: ''
          }
        }),
        expect.objectContaining({ property: 'port' }),
      ]),
    );
  });

  it('should fail validation if main fields are invalid', async () => {
    const input = {
      name: '',
      slug: '',
      isEnabled: null,
      database: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        username: 'admin',
        password: 'password123',
        certificate: null,
      },
    };

    const transformed = plainToInstance(CreateTenantDto, input);
    const errors = await validate(transformed);

    expect(errors).toHaveLength(1);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: {
            name: '',
            slug: '',
            isEnabled: null,
            database: expect.anything()
          }
        }),
        expect.objectContaining({ property: 'isEnabled' }),
      ]),
    );;
  });
});