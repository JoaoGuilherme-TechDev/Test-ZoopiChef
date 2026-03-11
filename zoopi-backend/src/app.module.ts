import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CompaniesModule } from './companies/companies.module';
import { ProfilesModule } from './profiles/profiles.module';
import { CategoriesModule } from './categories/categories.module';
import { SubcategoriesModule } from './subcategories/subcategories.module';
import { ProductsModule } from './products/products.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SharedModule } from './shared/shared.module';
import { FiscalModule } from './fiscal/fiscal.module';
import { OrdersModule } from './orders/orders.module';
import { TenantModule } from './tenant/tenant.module';
import { SaasModule } from './saas/saas.module';
import { TablesModule } from './tables/tables.module'
import { WaitlistModule } from './waitlist/waitlist.module';
import { PublicModule } from './public/public.module';
import { CustomersModule } from './customers/customers.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CompaniesModule,
    SharedModule,
    ProfilesModule,
    CategoriesModule,
    SubcategoriesModule,
    ProductsModule,
    DashboardModule,
    FiscalModule,
    OrdersModule,
    TenantModule,
    SaasModule,
    TablesModule,
    CustomersModule,
    WaitlistModule,
    PublicModule,
  ],
    
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
