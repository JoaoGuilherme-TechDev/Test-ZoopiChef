/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FiscalService } from './fiscal.service';
import { UpsertFiscalConfigDto } from './dto/upsert-fiscal-config.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { UpdateTaxRuleDto } from './dto/update-tax-rule.dto';
import { EmitInvoiceDto } from './dto/emit-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetCompanyId } from '../auth/decorators/get-company-id.decorator';
import { IsNotEmpty, IsString } from 'class-validator';

// DTO local para o upload do certificado
class UploadCertificateDto {
  @IsNotEmpty({ message: 'O conteúdo do certificado (Base64) é obrigatório' })
  @IsString()
  certificate_base64: string;

  @IsNotEmpty({ message: 'A senha do certificado é obrigatória' })
  @IsString()
  password: string;
}

@Controller('fiscal')
@UseGuards(JwtAuthGuard)
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  // --- CONFIGURAÇÃO E CERTIFICADO ---

  @Get('config')
  getConfig(@GetCompanyId() companyId: string) {
    return this.fiscalService.getConfig(companyId);
  }

  @Post('config')
  @HttpCode(HttpStatus.OK)
  upsertConfig(
    @GetCompanyId() companyId: string,
    @Body() dto: UpsertFiscalConfigDto,
  ) {
    return this.fiscalService.upsertConfig(companyId, dto);
  }

  @Post('certificate')
  @HttpCode(HttpStatus.OK)
  uploadCertificate(
    @GetCompanyId() companyId: string,
    @Body() dto: UploadCertificateDto,
  ) {
    return this.fiscalService.uploadCertificate(
      companyId,
      dto.certificate_base64,
      dto.password,
    );
  }

  // --- REGRAS TRIBUTÁRIAS (TAX RULES) ---

  @Get('tax-rules')
  findAllTaxRules(@GetCompanyId() companyId: string) {
    return this.fiscalService.findAllTaxRules(companyId);
  }

  @Post('tax-rules')
  createTaxRule(
    @GetCompanyId() companyId: string,
    @Body() dto: CreateTaxRuleDto,
  ) {
    return this.fiscalService.createTaxRule(companyId, dto);
  }

  @Patch('tax-rules/:id')
  updateTaxRule(
    @Param('id') id: string,
    @GetCompanyId() companyId: string,
    @Body() dto: UpdateTaxRuleDto,
  ) {
    return this.fiscalService.updateTaxRule(id, companyId, dto);
  }

  @Delete('tax-rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTaxRule(@Param('id') id: string, @GetCompanyId() companyId: string) {
    return this.fiscalService.removeTaxRule(id, companyId);
  }

  // --- GERAÇÃO E EMISSÃO ---

  /**
   * POST /api/fiscal/invoices/draft
   * Gera o rascunho tributário da nota baseado em um pedido existente.
   * Ideal para conferência antes do envio definitivo para a SEFAZ.
   */
  @Post('invoices/draft')
  @HttpCode(HttpStatus.CREATED)
  async generateDraft(
    @GetCompanyId() companyId: string,
    @Body() dto: EmitInvoiceDto,
  ) {
    return this.fiscalService.generateInvoiceDraft(companyId, dto);
  }

  /**
   * Rota de utilidade para testar a regra tributária sem criar rascunho
   */
  @Get('tax-rules/match')
  async matchRule(
    @GetCompanyId() companyId: string,
    @Query('dest_uf') destUf: string,
  ) {
    // Busca a UF da empresa logada para servir como origem
    const config = await this.fiscalService.getConfig(companyId);
    // Para simplificar, assumimos que a IE começa com o código da UF,
    // mas o ideal é ter o campo origin_uf no cadastro de endereço da empresa.
    const originUf = 'SP';

    return this.fiscalService.findApplicableRule(companyId, originUf, destUf);
  }
}
