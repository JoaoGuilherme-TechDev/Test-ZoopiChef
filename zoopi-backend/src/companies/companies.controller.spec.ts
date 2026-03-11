import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { DRIZZLE } from '../database/database.module';

describe('CompaniesController', () => {
  let controller: CompaniesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [
        CompaniesService,
        {
          provide: DRIZZLE,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<CompaniesController>(CompaniesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
