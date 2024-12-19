import { decrypt, encrypt } from "../../../../../utils/encrypt";
import { TenantDatabase } from "../tenant-database.entity";

jest.mock('../../../../../utils/encrypt', () => ({
  encrypt: jest.fn((text: string) => `encrypted-${text}`),
  decrypt: jest.fn((text: string) => text.replace('encrypted-', '')),
}));

describe('TenantDatabase Entity', () => {
  let tenantDatabase: TenantDatabase;

  beforeEach(() => {
    tenantDatabase = new TenantDatabase();
  });

  describe('setDatabase()', () => {
    it('should encrypt the database value', () => {
      tenantDatabase.setDatabase('test_database');
      expect(encrypt).toHaveBeenCalledWith('test_database');
      expect(tenantDatabase.database).toBe('encrypted-test_database');
    });
  });

  describe('setUsername()', () => {
    it('should encrypt the username value', () => {
      tenantDatabase.setUsername('test_user');
      expect(encrypt).toHaveBeenCalledWith('test_user');
      expect(tenantDatabase.username).toBe('encrypted-test_user');
    });
  });

  describe('setPassword()', () => {
    it('should encrypt the password value', () => {
      tenantDatabase.setPassword('test_password');
      expect(encrypt).toHaveBeenCalledWith('test_password');
      expect(tenantDatabase.password).toBe('encrypted-test_password');
    });
  });

  describe('setCertificate()', () => {
    it('should encrypt the certificate value', () => {
      tenantDatabase.setCertificate('test_certificate');
      expect(encrypt).toHaveBeenCalledWith('test_certificate');
      expect(tenantDatabase.certificate).toBe('encrypted-test_certificate');
    });

    it('should handle null certificate value', () => {
      tenantDatabase.setCertificate(null);
      expect(encrypt).toHaveBeenCalledWith(null);
      expect(tenantDatabase.certificate).toBe('encrypted-null');
    });
  });

  describe('decrypt()', () => {
    it('should decrypt all encrypted fields', () => {
      tenantDatabase.host = 'localhost';
      tenantDatabase.port = 5432;
      tenantDatabase.database = 'encrypted-test_database';
      tenantDatabase.username = 'encrypted-test_user';
      tenantDatabase.password = 'encrypted-test_password';
      tenantDatabase.certificate = 'encrypted-test_certificate';

      const decrypted = tenantDatabase.decrypt();

      expect(decrypt).toHaveBeenCalledWith('encrypted-test_database');
      expect(decrypt).toHaveBeenCalledWith('encrypted-test_user');
      expect(decrypt).toHaveBeenCalledWith('encrypted-test_password');
      expect(decrypt).toHaveBeenCalledWith('encrypted-test_certificate');

      expect(decrypted).toEqual({
        host: 'localhost',
        port: 5432,
        database: 'test_database',
        username: 'test_user',
        password: 'test_password',
        certificate: 'test_certificate',
      });
    });

    it('should handle null values in decrypt', () => {
      tenantDatabase.host = 'localhost';
      tenantDatabase.port = 5432;
      tenantDatabase.database = null;
      tenantDatabase.username = null;
      tenantDatabase.password = null;
      tenantDatabase.certificate = null;

      const decrypted = tenantDatabase.decrypt();

      expect(decrypted).toEqual({
        host: 'localhost',
        port: 5432,
        database: null,
        username: null,
        password: null,
        certificate: null,
      });
    });
  });
});
