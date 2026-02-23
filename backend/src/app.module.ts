import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PrintingModule } from './printing/printing.module';
import { PrintAgentModule } from './print-agent/print-agent.module';
import { FiscalModule } from './fiscal/fiscal.module';
import { DeliveryModule } from './delivery/delivery.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { FlavorGroupsModule } from './flavor-groups/flavor-groups.module';
import { FlavorsModule } from './flavors/flavors.module';
import { OptionalGroupsModule } from './optional-groups/optional-groups.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { SubcategoriesModule } from './subcategories/subcategories.module';
import { CashSessionsModule } from './cash-sessions/cash-sessions.module';
import { CustomersModule } from './customers/customers.module';
import { DeliverersModule } from './deliverers/deliverers.module';
import { UploadsModule } from './uploads/uploads.module';
import { CompaniesModule } from './companies/companies.module';
import { CombosModule } from './combos/combos.module';
import { CronModule } from './cron/cron.module';

import { FiscalConfig } from './fiscal/entities/fiscal-config.entity';
import { DeliveryConfig } from './delivery/entities/delivery-config.entity';
import { Product } from './products/entities/product.entity';
import { ProductPizzaConfig } from './products/entities/product-pizza-config.entity';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { Customer } from './customers/entities/customer.entity';
import { Deliverer } from './deliverers/entities/deliverer.entity';
import { CashSession } from './cash-sessions/entities/cash-session.entity';
import { FlavorGroup } from './flavor-groups/entities/flavor-group.entity';
import { Flavor } from './flavors/entities/flavor.entity';
import { FlavorPrice } from './flavors/entities/flavor-price.entity';
import { ProductFlavor } from './flavors/entities/product-flavor.entity';
import { OptionalGroup } from './optional-groups/entities/optional-group.entity';
import { OptionalGroupItem } from './optional-groups/entities/optional-group-item.entity';
import { User } from './users/entities/user.entity';
import { Category } from './categories/entities/category.entity';
import { Subcategory } from './subcategories/entities/subcategory.entity';
import { Company } from './companies/entities/company.entity';
import { CompanyIntegrations } from './companies/entities/company-integrations.entity';
import { CompanyAISettings } from './companies/entities/company-ai-settings.entity';
import { CompanyPublicLinks } from './companies/entities/company-public-links.entity';
import { Combo } from './combos/entities/combo.entity';
import { ComboGroup } from './combos/entities/combo-group.entity';
import { ComboGroupItem } from './combos/entities/combo-group-item.entity';
import { TablesModule } from './tables/tables.module';
import { Table } from './tables/entities/table.entity';
import { TableEvent } from './tables/entities/table-event.entity';
import { TableSession } from './tables/entities/table-session.entity';
import { Comanda } from './tables/entities/comanda.entity';
import { ReservationsModule } from './reservations/reservations.module';
import { Reservation } from './reservations/entities/reservation.entity';
import { ReservationSettings } from './reservations/entities/reservation-settings.entity';
import { WaitlistEntry } from './reservations/entities/waitlist-entry.entity';
import { ReservationBlock } from './reservations/entities/reservation-block.entity';
import { SmartWaitlistEntry } from './reservations/entities/smart-waitlist-entry.entity';
import { SmartWaitlistSettings } from './reservations/entities/smart-waitlist-settings.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'zoopi',
      entities: [
        FiscalConfig, 
        DeliveryConfig,
        Product,
        ProductPizzaConfig,
        Order,
        OrderItem,
        Customer,
        Deliverer,
        FlavorGroup,
        Flavor,
        FlavorPrice,
        ProductFlavor,
        OptionalGroup,
        OptionalGroupItem,
        User,
        Category,
        Subcategory,
        CashSession,
        Company,
        CompanyIntegrations,
        CompanyAISettings,
        CompanyPublicLinks,
        Combo,
        ComboGroup,
        ComboGroupItem,
        Table,
        TableEvent,
        TableSession,
        Comanda,
        Reservation,
        ReservationSettings,
        WaitlistEntry,
        ReservationBlock,
        SmartWaitlistEntry,
        SmartWaitlistSettings
      ],
      synchronize: true, // Auto-create tables (dev only)
    }),
    PrintingModule,
    PrintAgentModule,
    FiscalModule,
    DeliveryModule,
    ProductsModule,
    OrdersModule,
    FlavorGroupsModule,
    OptionalGroupsModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    SubcategoriesModule,
    CashSessionsModule,
    CustomersModule,
    DeliverersModule,
    UploadsModule,
    CompaniesModule,
    CombosModule,
    TablesModule,
    ReservationsModule,
    CronModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
