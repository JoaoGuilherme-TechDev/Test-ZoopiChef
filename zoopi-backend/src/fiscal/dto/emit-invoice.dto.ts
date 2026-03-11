import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsUUID,
  IsOptional,
  Length,
} from 'class-validator';

// Reutilizamos o conceito do schema
export enum InvoiceType {
  NFE = 'nfe',
  NFCE = 'nfce',
  NFSE = 'nfse',
}

export class EmitInvoiceDto {
  @IsNotEmpty({ message: 'O ID do pedido é obrigatório' })
  @IsUUID('4', { message: 'O ID do pedido deve ser um UUID válido' })
  order_id: string;

  @IsNotEmpty({ message: 'O tipo de nota é obrigatório (nfe ou nfce)' })
  @IsEnum(InvoiceType, { message: 'Tipo de nota inválido. Use nfe ou nfce.' })
  type: InvoiceType;

  /**
   * UF de destino é essencial para bater com a TaxRule correta.
   * Em NFC-e (consumidor final presencial), geralmente é a mesma UF da empresa.
   */
  @IsNotEmpty({
    message: 'A UF de destino é obrigatória para o cálculo tributário',
  })
  @IsString()
  @Length(2, 2, { message: 'A UF deve ter exatamente 2 caracteres (Ex: SP)' })
  dest_uf: string;

  /**
   * O CPF/CNPJ pode ser enviado agora ou capturado do cadastro do cliente no pedido.
   * Se enviado aqui, tem prioridade.
   */
  @IsOptional()
  @IsString()
  @Length(11, 14, {
    message:
      'O documento do cliente deve ter entre 11 (CPF) e 14 (CNPJ) dígitos',
  })
  customer_tax_id?: string;
}
