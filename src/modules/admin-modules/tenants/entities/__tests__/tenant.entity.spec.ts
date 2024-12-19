import { Tenant } from '../tenant.entity';
import { TenantDatabase } from '../tenant-database.entity';
import { getMetadataArgsStorage } from 'typeorm';

describe('Tenant Entity', () => {
  let tenant: Tenant;

  beforeEach(() => {
    tenant = new Tenant();
  });

  it('should have the required properties', () => {
    // Instanciar a entidade manualmente
    const tenant = new Tenant();
    tenant.name = 'Test Tenant';
    tenant.slug = 'test-tenant';
    tenant.isEnabled = true;
    tenant.database = new TenantDatabase();

    expect(tenant).toHaveProperty('name');
    expect(tenant).toHaveProperty('slug');
    expect(tenant).toHaveProperty('isEnabled');
    expect(tenant).toHaveProperty('database'); // Propriedade da relação
  });

  it('should initialize with correct values', () => {
    const tenant = new Tenant();
    tenant.name = 'Test Tenant';
    tenant.slug = 'test-tenant';
    tenant.isEnabled = false; // Valor atribuído manualmente

    expect(tenant.name).toBe('Test Tenant');
    expect(tenant.slug).toBe('test-tenant');
    expect(tenant.isEnabled).toBe(false); // Verifica o valor atribuído
  });

  it('should have correct column configurations', () => {
    const metadata = Reflect.getMetadata('design:type', tenant, 'name');
    expect(metadata).toBe(String);

    const slugMetadata = Reflect.getMetadata('design:type', tenant, 'slug');
    expect(slugMetadata).toBe(String);
  });

  it('should have a one-to-one relation with TenantDatabase', () => {
    const relationMetadata = Reflect.getMetadata('design:type', tenant, 'database');
    expect(relationMetadata).toBe(TenantDatabase);
  });
});
