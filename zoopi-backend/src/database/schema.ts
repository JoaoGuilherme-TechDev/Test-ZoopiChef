import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  decimal,
  text,
  pgEnum,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- ENUMS ---
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'pending',
  'authorized',
  'cancelled',
  'error',
  'denied',
]);
export const invoiceTypeEnum = pgEnum('invoice_type', ['nfe', 'nfce', 'nfse']);
export const taxRegimeEnum = pgEnum('tax_regime', [
  'simples_nacional',
  'simples_nacional_excesso',
  'lucro_presumido',
  'lucro_real',
]);
export const productTypeEnum = pgEnum('product_type', [
  'simple',
  'pizza',
  'additional',
  'combo',
]);

export const tableEventTypeEnum = pgEnum('table_event_type', [
  'call_waiter',
  'ask_bill',
]);
export const tableEventStatusEnum = pgEnum('table_event_status', [
  'pending',
  'attended',
  'cancelled',
]);

// --- TABELAS BASE ---
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: varchar('role', { length: 50 }).default('user').notNull(),
  global_role: varchar('global_role', { length: 50 }), // MANTIDO PARA SEGURANÇA
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  is_active: boolean('is_active').default(true).notNull(),
  logo_url: text('logo_url'),
  primary_color: varchar('primary_color', { length: 20 }),

  // CAMPOS DE PLANO MANTIDOS PARA EVITAR DATA LOSS
  plan_type: varchar('plan_type', { length: 50 }),
  plan_status: varchar('plan_status', { length: 50 }),
  expires_at: timestamp('expires_at'),

  cnpj: varchar('cnpj', { length: 14 }),
  ie: varchar('ie', { length: 20 }),
  im: varchar('im', { length: 20 }),
  crt: integer('crt').default(1),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  full_name: varchar('full_name', { length: 255 }),
  role: varchar('role', { length: 50 }), // MANTIDO PARA SEGURANÇA
  avatar_url: text('avatar_url'), // NOVO
  phone: varchar('phone', { length: 20 }), // NOVO
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  image_url: text('image_url'),
  color: varchar('color', { length: 20 }),
  order: integer('order').default(0),
  active: boolean('active').default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const subcategories = pgTable('subcategories', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  category_id: uuid('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  order: integer('order').default(0),
  active: boolean('active').default(true),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  subcategory_id: uuid('subcategory_id').references(() => subcategories.id, {
    onDelete: 'cascade',
  }),
  category_id: uuid('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: productTypeEnum('type').default('simple').notNull(),
  image_url: text('image_url'),
  active: boolean('active').default(true),
  sku: varchar('sku', { length: 100 }),
  ncm: varchar('ncm', { length: 10 }),
  cest: varchar('cest', { length: 10 }),
  display_name: varchar('display_name', { length: 255 }),
  unit: varchar('unit', { length: 50 }),
  brand: varchar('brand', { length: 100 }),
  weight: varchar('weight', { length: 50 }),
  ean: varchar('ean', { length: 20 }),
  cost_price: decimal('cost_price', { precision: 10, scale: 2 }),
  profit_margin: decimal('profit_margin', { precision: 5, scale: 2 }),
  sale_price: decimal('sale_price', { precision: 10, scale: 2 }),
  is_on_sale: boolean('is_on_sale').default(false).notNull(),
  wholesale_price: decimal('wholesale_price', { precision: 10, scale: 2 }),
  wholesale_min_qty: integer('wholesale_min_qty'),
  loyalty_points: integer('loyalty_points').default(0),
  enologist_notes: text('enologist_notes'),
  featured: boolean('featured').default(false).notNull(),
  commission: boolean('commission').default(true).notNull(),
  production_location: varchar('production_location', { length: 100 }),
  aparece_delivery: boolean('aparece_delivery').default(true).notNull(),
  aparece_garcom: boolean('aparece_garcom').default(true).notNull(),
  aparece_totem: boolean('aparece_totem').default(true).notNull(),
  aparece_tablet: boolean('aparece_tablet').default(true).notNull(),
  aparece_mesa: boolean('aparece_mesa').default(true).notNull(),
  aparece_comanda: boolean('aparece_comanda').default(true).notNull(),
  aparece_tv: boolean('aparece_tv').default(true).notNull(),
  aparece_self_service: boolean('aparece_self_service').default(true).notNull(),
  display_on_tablet: boolean('display_on_tablet').default(true).notNull(),
  composition: text('composition'),
  production_weight: varchar('production_weight', { length: 50 }).default(
    '1.0',
  ),
  is_weighted: boolean('is_weighted').default(false).notNull(),
  tax_status: varchar('tax_status', { length: 50 }).default('tributado'),
  internal_code: varchar('internal_code', { length: 100 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const productPrices = pgTable('product_prices', {
  id: uuid('id').defaultRandom().primaryKey(),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 50 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  delivery_price: decimal('delivery_price', { precision: 10, scale: 2 }),
  order: integer('order').default(0),
});

export const productOptionsGroups = pgTable('product_options_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  min_qty: integer('min_qty').default(0),
  max_qty: integer('max_qty').default(1),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const productOptionsItems = pgTable('product_options_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  group_id: uuid('group_id')
    .notNull()
    .references(() => productOptionsGroups.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 })
    .default('0.00')
    .notNull(),
  active: boolean('active').default(true).notNull(),
  order: integer('order').default(0),
});

export const productsToOptionsGroups = pgTable(
  'products_to_options_groups',
  {
    product_id: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    group_id: uuid('group_id')
      .notNull()
      .references(() => productOptionsGroups.id, { onDelete: 'cascade' }),
    order: integer('order').default(0),
    min_select: integer('min_select'),
    max_select: integer('max_select'),
    calc_mode: varchar('calc_mode', { length: 50 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.product_id, t.group_id] }),
  }),
);

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  order_number: integer('order_number').notNull(),
  customer_name: varchar('customer_name', { length: 255 }),
  customer_tax_id: varchar('customer_tax_id', { length: 20 }),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  payment_method: varchar('payment_method', { length: 50 }),
  table_number: varchar('table_number', { length: 50 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  order_id: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id),
  quantity: integer('quantity').notNull(),
  unit_price: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
});

export const tableEvents = pgTable('table_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  table_number: varchar('table_number', { length: 50 }).notNull(),
  type: tableEventTypeEnum('type').notNull(),
  status: tableEventStatusEnum('status').default('pending').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const fiscalConfigs = pgTable('fiscal_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .unique()
    .references(() => companies.id),
  cnpj: varchar('cnpj', { length: 14 }).notNull(),
  ie: varchar('ie', { length: 20 }).notNull(),
  im: varchar('im', { length: 20 }),
  tax_regime: taxRegimeEnum('tax_regime').default('simples_nacional').notNull(),
  is_sandbox: boolean('is_sandbox').default(true).notNull(),
  csc_token: varchar('csc_token', { length: 255 }),
  csc_id: varchar('csc_id', { length: 10 }),
  certificate_expires_at: timestamp('certificate_expires_at'),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const fiscalCertificates = pgTable('fiscal_certificates', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .unique()
    .references(() => companies.id),
  base64_content: text('base64_content').notNull(),
  password_encrypted: text('password_encrypted').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const taxRules = pgTable('tax_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  cfop: varchar('cfop', { length: 4 }).notNull(),
  origin_uf: varchar('origin_uf', { length: 2 }).notNull(),
  dest_uf: varchar('dest_uf', { length: 2 }).notNull(),
  icms_cst: varchar('icms_cst', { length: 3 }).notNull(),
  icms_orig: integer('icms_orig').default(0).notNull(),
  icms_rate: decimal('icms_rate', { precision: 5, scale: 2 }).default('0.00'),
  pis_cst: varchar('pis_cst', { length: 2 }),
  pis_rate: decimal('pis_rate', { precision: 5, scale: 2 }).default('0.00'),
  cofins_cst: varchar('cofins_cst', { length: 2 }),
  cofins_rate: decimal('cofins_rate', { precision: 5, scale: 2 }).default(
    '0.00',
  ),
  is_default: boolean('is_default').default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  order_id: uuid('order_id')
    .notNull()
    .references(() => orders.id),
  type: invoiceTypeEnum('type').notNull(),
  status: invoiceStatusEnum('status').default('draft').notNull(),
  customer_tax_id: varchar('customer_tax_id', { length: 20 }),
  access_key: varchar('access_key', { length: 44 }),
  invoice_number: integer('invoice_number'),
  series: integer('series'),
  xml_url: text('xml_url'),
  pdf_url: text('pdf_url'),
  sefaz_message: text('sefaz_message'),
  protocol: varchar('protocol', { length: 50 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// --- RELAÇÕES ---
export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.user_id],
  }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.user_id],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [profiles.company_id],
    references: [companies.id],
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  profiles: many(profiles),
  categories: many(categories),
  orders: many(orders),
  tableEvents: many(tableEvents),
  restaurantTables: many(restaurantTables),
  waitlist: many(waitlist),
  customers: many(customers),
  tablePayments: many(tablePayments),
}));

// --- ENUM ---
export const restaurantTableStatusEnum = pgEnum('restaurant_table_status', [
  'free',
  'occupied',
  'reserved',
  'no_consumption',
  'payment',
]);

// --- TABELA ---
export const restaurantTables = pgTable('restaurant_tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  capacity: integer('capacity').notNull().default(4),
  section: varchar('section', { length: 100 }),
  status: restaurantTableStatusEnum('status').notNull().default('free'),
  occupied_since: timestamp('occupied_since'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// --- RELAÇÃO ---
export const restaurantTablesRelations = relations(
  restaurantTables,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [restaurantTables.company_id],
      references: [companies.id],
    }),
    commands: many(commands),
    sessionItems: many(tableSessionItems),
    payments: many(tablePayments),
  }),
);

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  company: one(companies, {
    fields: [categories.company_id],
    references: [companies.id],
  }),
  subcategories: many(subcategories),
}));

export const subcategoriesRelations = relations(
  subcategories,
  ({ one, many }) => ({
    category: one(categories, {
      fields: [subcategories.category_id],
      references: [categories.id],
    }),
    products: many(products),
  }),
);

export const productsRelations = relations(products, ({ one, many }) => ({
  subcategory: one(subcategories, {
    fields: [products.subcategory_id],
    references: [subcategories.id],
  }),
  category: one(categories, {
    fields: [products.category_id],
    references: [categories.id],
  }),
  prices: many(productPrices),
  optionsGroups: many(productsToOptionsGroups),
}));

export const productPricesRelations = relations(productPrices, ({ one }) => ({
  product: one(products, {
    fields: [productPrices.product_id],
    references: [products.id],
  }),
}));

export const productOptionsGroupsRelations = relations(
  productOptionsGroups,
  ({ many }) => ({
    items: many(productOptionsItems),
    products: many(productsToOptionsGroups),
  }),
);

export const productOptionsItemsRelations = relations(
  productOptionsItems,
  ({ one }) => ({
    group: one(productOptionsGroups, {
      fields: [productOptionsItems.group_id],
      references: [productOptionsGroups.id],
    }),
  }),
);

export const productsToOptionsGroupsRelations = relations(
  productsToOptionsGroups,
  ({ one }) => ({
    product: one(products, {
      fields: [productsToOptionsGroups.product_id],
      references: [products.id],
    }),
    group: one(productOptionsGroups, {
      fields: [productsToOptionsGroups.group_id],
      references: [productOptionsGroups.id],
    }),
  }),
);
// --- ENUM ---
export const waitlistStatusEnum = pgEnum('waitlist_status', [
  'waiting',    // in queue, not yet called
  'notified',   // called / notified, waiting to be seated
  'seated',     // successfully seated
  'cancelled',  // removed by staff
  'no_show',    // notified but didn't show up
]);

// --- TABLE ---
export const waitlist = pgTable('waitlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  customer_name: varchar('customer_name', { length: 255 }).notNull(),
  customer_phone: varchar('customer_phone', { length: 30 }),
  party_size: integer('party_size').notNull().default(1),
  special_requests: text('special_requests'),
  status: waitlistStatusEnum('status').notNull().default('waiting'),
  assigned_table_id: uuid('assigned_table_id').references(
    () => restaurantTables.id,
    { onDelete: 'set null' },
  ),
  notified_at: timestamp('notified_at'),
  seated_at: timestamp('seated_at'),
  requested_at: timestamp('requested_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// --- RELATIONS ---
export const waitlistRelations = relations(waitlist, ({ one }) => ({
  company: one(companies, {
    fields: [waitlist.company_id],
    references: [companies.id],
  }),
  assignedTable: one(restaurantTables, {
    fields: [waitlist.assigned_table_id],
    references: [restaurantTables.id],
  }),
}));

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }),
  tax_id: varchar('tax_id', { length: 20 }), // CPF ou CNPJ
    alert_message: text('alert_message'), // Alertas visíveis nos pedidos
  internal_notes: text('internal_notes'), // Observações internas 
  allow_fiado: boolean('allow_fiado').default(true).notNull(),
  credit_limit_cents: integer('credit_limit_cents').default(0).notNull(),
  is_blocked: boolean('is_blocked').default(false).notNull(),
  allow_marketing: boolean('allow_marketing').default(true).notNull(),
  marketing_channel: varchar('marketing_channel', { length: 50 }).default('whatsapp'),
  address: text('address'),
  neighborhood: varchar('neighborhood', { length: 100 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  zip_code: varchar('zip_code', { length: 10 }),
  balance_cents: integer('balance_cents').default(0).notNull(), // Saldo devedor/crédito
  notes: text('notes'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, {
    fields: [customers.company_id],
    references: [companies.id],
  }),
    addresses: many(customerAddresses),
}));

export const customerAddresses = pgTable('customer_addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  customer_id: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 50 }).default('Endereço'), // Ex: Casa, Trabalho
  street: varchar('street', { length: 255 }).notNull(),
  number: varchar('number', { length: 20 }),
  complement: varchar('complement', { length: 100 }),
  neighborhood: varchar('neighborhood', { length: 100 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  is_favorite: boolean('is_favorite').default(false),
});

export const customerAddressesRelations = relations(customerAddresses, ({ one }) => ({
  customer: one(customers, {
    fields: [customerAddresses.customer_id],
    references: [customers.id],
  }),
}))


// --- ENUM ---
export const commandStatusEnum = pgEnum('command_status', ['open', 'closed']);

// --- COMMANDS (comandas por mesa) ---
export const commands = pgTable('commands', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  table_id: uuid('table_id')
    .notNull()
    .references(() => restaurantTables.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  status: commandStatusEnum('status').notNull().default('open'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const commandsRelations = relations(commands, ({ one, many }) => ({
  company: one(companies, {
    fields: [commands.company_id],
    references: [companies.id],
  }),
  table: one(restaurantTables, {
    fields: [commands.table_id],
    references: [restaurantTables.id],
  }),
  items: many(tableSessionItems),
}));

// --- SESSION ITEMS (itens lançados na mesa/comanda) ---
export const tableSessionItems = pgTable('table_session_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  table_id: uuid('table_id')
    .notNull()
    .references(() => restaurantTables.id, { onDelete: 'cascade' }),
  command_id: uuid('command_id').references(() => commands.id, {
    onDelete: 'set null',
  }),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id),
  quantity: integer('quantity').notNull(),
  unit_price: decimal('unit_price', { precision: 10, scale: 2 }).notNull(), // snapshot do preço
  note: text('note'),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending | preparing | delivered
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const tableSessionItemsRelations = relations(
  tableSessionItems,
  ({ one }) => ({
    company: one(companies, {
      fields: [tableSessionItems.company_id],
      references: [companies.id],
    }),
    table: one(restaurantTables, {
      fields: [tableSessionItems.table_id],
      references: [restaurantTables.id],
    }),
    command: one(commands, {
      fields: [tableSessionItems.command_id],
      references: [commands.id],
    }),
    product: one(products, {
      fields: [tableSessionItems.product_id],
      references: [products.id],
    }),
  }),
);

// --- ENUMS ---
export const paymentMethodEnum = pgEnum('payment_method', [
  'dinheiro',
  'credito',
  'debito',
  'pix',
  'maquininha',
]);

export const paymentModeEnum = pgEnum('payment_mode', [
  'total',
  'parcial',
  'por_comanda',
  'adiantamento',
]);

// --- TABLE ---
export const tablePayments = pgTable('table_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  table_id: uuid('table_id')
    .notNull()
    .references(() => restaurantTables.id, { onDelete: 'cascade' }),
  command_id: uuid('command_id').references(() => commands.id, {
    onDelete: 'set null',
  }),
  customer_id: uuid('customer_id').references(() => customers.id, {
    onDelete: 'set null',
  }),
  customer_name: varchar('customer_name', { length: 255 }),
  method: paymentMethodEnum('method').notNull(),
  mode: paymentModeEnum('mode').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// --- RELATIONS ---
export const tablePaymentsRelations = relations(tablePayments, ({ one }) => ({
  company: one(companies, {
    fields: [tablePayments.company_id],
    references: [companies.id],
  }),
  table: one(restaurantTables, {
    fields: [tablePayments.table_id],
    references: [restaurantTables.id],
  }),
  command: one(commands, {
    fields: [tablePayments.command_id],
    references: [commands.id],
  }),
  customer: one(customers, {
    fields: [tablePayments.customer_id],
    references: [customers.id],
  }),
}));

