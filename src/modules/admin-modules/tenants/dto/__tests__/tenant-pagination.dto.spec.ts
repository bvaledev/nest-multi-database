import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TenantPaginationDto } from '../tenant-pagination.dto';

describe('TenantPaginationDto', () => {
  it('should pass validation with default values', async () => {
    const input = {};
    const transformed = plainToInstance(TenantPaginationDto, input);

    const errors = await validate(transformed);

    expect(errors).toHaveLength(0);
    expect(transformed.page).toBe(1); // Valor padrão
    expect(transformed.limit).toBe(10); // Valor padrão
  });

  it('should validate and transform valid input', async () => {
    const input = {
      search: 'tenant',
      page: '2', // Transformado para número
      limit: '15', // Transformado para número
    };

    const transformed = plainToInstance(TenantPaginationDto, input);

    const errors = await validate(transformed);

    expect(errors).toHaveLength(0);
    expect(transformed.page).toBe(2); // Confirmar transformação
    expect(transformed.limit).toBe(15); // Confirmar transformação
    expect(transformed.search).toBe('tenant');
  });

  it('should fail validation if page is less than 1', async () => {
    const input = { page: 0 };

    const transformed = plainToInstance(TenantPaginationDto, input);

    const errors = await validate(transformed);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('page');
    expect(errors[0].constraints).toEqual({
      min: 'page must not be less than 1',
    });
  });

  it('should fail validation if limit is less than 10', async () => {
    const input = { limit: 5 };

    const transformed = plainToInstance(TenantPaginationDto, input);

    const errors = await validate(transformed);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('limit');
    expect(errors[0].constraints).toEqual({
      min: 'limit must not be less than 10',
    });
  });

  it('should fail validation if page or limit are not integers', async () => {
    const input = { page: '1.5', limit: 'abc' };

    const transformed = plainToInstance(TenantPaginationDto, input);

    const errors = await validate(transformed);

    expect(errors).toHaveLength(2);
    const errorProperties = errors.map((error) => error.property);

    expect(errorProperties).toEqual(expect.arrayContaining(['page', 'limit']));
  });

  it('should pass validation when search is not provided', async () => {
    const input = { page: 1, limit: 10 };

    const transformed = plainToInstance(TenantPaginationDto, input);

    const errors = await validate(transformed);

    expect(errors).toHaveLength(0);
    expect(transformed.search).toBeUndefined();
  });
});
