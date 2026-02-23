import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TablesService } from './tables.service';
import { TablesController, TableEventsController, TableSessionsController, TableCommandsController, TableCommandItemsController } from './tables.controller';
import { Table } from './entities/table.entity';
import { TableEvent } from './entities/table-event.entity';
import { TableSession } from './entities/table-session.entity';
import { Comanda } from './entities/comanda.entity';
import { ComandaItem } from './entities/comanda-item.entity';
import { ComandaPayment } from './entities/comanda-payment.entity';
import { ComandaEvent } from './entities/comanda-event.entity';
import { ComandaSettings } from './entities/comanda-settings.entity';
import { TableCommand } from './entities/table-command.entity';
import { TableCommandItem } from './entities/table-command-item.entity';
import { ComandasService } from './comandas.service';
import { ComandasController, ComandaSettingsController } from './comandas.controller';

import { ComandaItemsService } from './comanda-items.service';
import { ComandaItemsController } from './comanda-items.controller';

import { ComandaPaymentsService } from './comanda-payments.service';
import { ComandaPaymentsController } from './comanda-payments.controller';

import { ComandaValidatorService } from './comanda-validator.service';
import { ComandaValidatorController } from './comanda-validator.controller';
import { ComandaValidatorToken } from './entities/comanda-validator-token.entity';
import { ComandaValidationLog } from './entities/comanda-validation-log.entity';

import { TableModuleSettings } from './entities/table-module-settings.entity';
import { TableModuleSettingsService } from './table-module-settings.service';
import { TableModuleSettingsController } from './table-module-settings.controller';

import { ComandaQRToken } from './entities/comanda-qr-token.entity';
import { ComandaQRTokensService } from './comanda-qr-tokens.service';
import { ComandaQRTokensController } from './comanda-qr-tokens.controller';

import { TableQRToken } from './entities/table-qr-token.entity';
import { TableQRTokensService } from './table-qr-tokens.service';
import { TableQRTokensController } from './table-qr-tokens.controller';
import { CompanyTableSettings } from './entities/company-table-settings.entity';

import { Company } from '../companies/entities/company.entity';
import { CompanyIntegrations } from '../companies/entities/company-integrations.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
    Table, 
    TableEvent, 
    TableSession, 
    Comanda, 
    ComandaItem, 
    ComandaPayment, 
    ComandaEvent, 
    ComandaSettings,
    TableCommand, 
    TableCommandItem,
    ComandaValidatorToken,
    ComandaValidationLog,
    TableModuleSettings,
    ComandaQRToken,
    TableQRToken,
    CompanyTableSettings,
    Company,
    CompanyIntegrations
  ]),
  AuthModule
],
  controllers: [
    TablesController, 
    TableEventsController, 
    TableSessionsController, 
    TableCommandsController, 
    TableCommandItemsController,
    ComandasController,
    ComandaItemsController,
    ComandaSettingsController,
    ComandaPaymentsController,
    ComandaValidatorController,
    TableModuleSettingsController,
    ComandaQRTokensController,
    TableQRTokensController
  ],
  providers: [
    TablesService, 
    ComandasService, 
    ComandaItemsService, 
    ComandaPaymentsService, 
    ComandaValidatorService,
    TableModuleSettingsService,
    ComandaQRTokensService,
    TableQRTokensService
  ],
  exports: [
    TablesService, 
    ComandasService, 
    ComandaItemsService, 
    ComandaPaymentsService, 
    ComandaValidatorService,
    TableModuleSettingsService,
    ComandaQRTokensService,
    TableQRTokensService
  ],
})
export class TablesModule {}
