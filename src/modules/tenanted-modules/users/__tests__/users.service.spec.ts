import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { CONNECTION } from '../../../tenancy-module/tenancy.symbols';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: CONNECTION,
          useValue: {
            getRepository: jest.fn()
          }
        }
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
