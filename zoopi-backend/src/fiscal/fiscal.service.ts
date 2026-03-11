/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { UpsertFiscalConfigDto } from './dto/upsert-fiscal-config.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { UpdateTaxRuleDto } from './dto/update-tax-rule.dto';
import { EmitInvoiceDto } from './dto/emit-invoice.dto';
import { eq, and, ne, desc } from 'drizzle-orm';
import { EncryptionService } from '../shared/encryption.service';

@Injectable()
export class FiscalService {
  updateTaxRule(_id: string, _companyId: string, _dto: UpdateTaxRuleDto) {
    throw new Error('Method not implemented.');
  }
  removeTaxRule(_id: string, _companyId: string) {
    throw new Error('Method not implemented.');
  }
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private encryptionService: EncryptionService,
  ) {}

  // --- CONFIGURAÇÃO FISCAL (CNPJ, IE, CSC) ---

  async upsertConfig(companyId: string, dto: UpsertFiscalConfigDto) {
    const [config] = await this.db
      .insert(schema.fiscalConfigs)
      .values({
        company_id: companyId,
        cnpj: dto.cnpj,
        ie: dto.ie,
        im: dto.im,
        tax_regime: dto.tax_regime,
        is_sandbox: dto.is_sandbox ?? true,
        csc_token: dto.csc_token,
        csc_id: dto.csc_id,
      })
      .onConflictDoUpdate({
        target: schema.fiscalConfigs.company_id,
        set: { ...dto, updated_at: new Date() },
      })
      .returning();

    return config;
  }

  async getConfig(companyId: string) {
    const results = await this.db
      .select()
      .from(schema.fiscalConfigs)
      .where(eq(schema.fiscalConfigs.company_id, companyId));

    if (results.length === 0) {
      throw new NotFoundException('Configuração fiscal não encontrada.');
    }

    return results[0];
  }

  // --- CERTIFICADOS (CRIPTOGRAFIA) ---

  async uploadCertificate(
    companyId: string,
    fileBase64: string,
    password: string,
  ) {
    const encryptedPassword = this.encryptionService.encrypt(password);
    const encryptedFile = this.encryptionService.encrypt(fileBase64);

    await this.db
      .insert(schema.fiscalCertificates)
      .values({
        company_id: companyId,
        base64_content: encryptedFile,
        password_encrypted: encryptedPassword,
      })
      .onConflictDoUpdate({
        target: schema.fiscalCertificates.company_id,
        set: {
          base64_content: encryptedFile,
          password_encrypted: encryptedPassword,
          created_at: new Date(),
        },
      });

    return {
      success: true,
      message: 'Certificado digital atualizado com segurança.',
    };
  }

  async getDecryptedCertificate(companyId: string) {
    const results = await this.db
      .select()
      .from(schema.fiscalCertificates)
      .where(eq(schema.fiscalCertificates.company_id, companyId));

    if (results.length === 0)
      throw new NotFoundException('Certificado não encontrado.');

    return {
      base64: this.encryptionService.decrypt(results[0].base64_content),
      password: this.encryptionService.decrypt(results[0].password_encrypted),
    };
  }

  // --- REGRAS TRIBUTÁRIAS (CRUD) ---

  async createTaxRule(companyId: string, dto: CreateTaxRuleDto) {
    return await this.db.transaction(async (tx) => {
      if (dto.is_default) {
        await tx
          .update(schema.taxRules)
          .set({ is_default: false })
          .where(eq(schema.taxRules.company_id, companyId));
      }

      const [rule] = await tx
        .insert(schema.taxRules)
        .values({
          ...dto,
          company_id: companyId,
          icms_rate: dto.icms_rate?.toString(),
          pis_rate: dto.pis_rate?.toString(),
          cofins_rate: dto.cofins_rate?.toString(),
        })
        .returning();

      return rule;
    });
  }

  async findAllTaxRules(companyId: string) {
    return await this.db
      .select()
      .from(schema.taxRules)
      .where(eq(schema.taxRules.company_id, companyId))
      .orderBy(
        desc(schema.taxRules.is_default),
        desc(schema.taxRules.created_at),
      );
  }

  async findApplicableRule(
    companyId: string,
    originUf: string,
    destUf: string,
  ) {
    // 1. Tenta regra específica por UF
    const specificRules = await this.db
      .select()
      .from(schema.taxRules)
      .where(
        and(
          eq(schema.taxRules.company_id, companyId),
          eq(schema.taxRules.origin_uf, originUf.toUpperCase()),
          eq(schema.taxRules.dest_uf, destUf.toUpperCase()),
        ),
      );

    if (specificRules.length > 0) return specificRules[0];

    // 2. Fallback para regra padrão
    const defaultRules = await this.db
      .select()
      .from(schema.taxRules)
      .where(
        and(
          eq(schema.taxRules.company_id, companyId),
          eq(schema.taxRules.is_default, true),
        ),
      );

    if (defaultRules.length === 0) {
      throw new BadRequestException(
        'Nenhuma regra tributária encontrada para esta operação.',
      );
    }

    return defaultRules[0];
  }

  // --- EMISSÃO DE NOTAS (LÓGICA DE NEGÓCIO) ---

  async generateInvoiceDraft(companyId: string, dto: EmitInvoiceDto) {
    // Busca o pedido
    const orderResults = await this.db
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.id, dto.order_id),
          eq(schema.orders.company_id, companyId),
        ),
      );

    if (orderResults.length === 0)
      throw new NotFoundException('Pedido não encontrado.');
    const order = orderResults[0];

    // Busca itens do pedido e junta com dados do produto (NCM)
    const items = await this.db
      .select({
        id: schema.orderItems.id,
        quantity: schema.orderItems.quantity,
        unit_price: schema.orderItems.unit_price,
        product_name: schema.products.name,
        ncm: schema.products.ncm,
        product_id: schema.products.id,
      })
      .from(schema.orderItems)
      .innerJoin(
        schema.products,
        eq(schema.orderItems.product_id, schema.products.id),
      )
      .where(eq(schema.orderItems.order_id, order.id));

    // Determina regra tributária
    const originUf = 'SP'; // Futuramente: buscar do cadastro da empresa
    const taxRule = await this.findApplicableRule(
      companyId,
      originUf,
      dto.dest_uf,
    );

    // Cálculos Tributários
    const itemsWithTaxes = items.map((item) => {
      const subtotal = Number(item.unit_price) * item.quantity;
      const icmsValue = subtotal * (Number(taxRule.icms_rate) / 100);

      return {
        product_id: item.product_id,
        name: item.product_name,
        ncm: item.ncm,
        cfop: taxRule.cfop,
        vProd: subtotal.toFixed(2),
        icms_cst: taxRule.icms_cst,
        icms_rate: taxRule.icms_rate,
        icms_value: icmsValue.toFixed(2),
      };
    });

    // Registra no banco
    const [invoice] = await this.db
      .insert(schema.invoices)
      .values({
        company_id: companyId,
        order_id: order.id,
        type: dto.type,
        status: 'draft',
        customer_tax_id: dto.customer_tax_id || order.customer_tax_id,
      })
      .returning();

    return {
      invoice_id: invoice.id,
      tax_rule: taxRule.name,
      items: itemsWithTaxes,
      total_vProd: order.total,
      total_vICMS: itemsWithTaxes
        .reduce((acc, cur) => acc + Number(cur.icms_value), 0)
        .toFixed(2),
    };
  }
}
