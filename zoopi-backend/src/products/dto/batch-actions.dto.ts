import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsObject,
} from 'class-validator';

export class BatchLinkOptionalDto {
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @IsArray()
  groupLinks: {
    groupId: string;
    minSelect?: number;
    maxSelect?: number;
    sortOrder?: number;
    calcMode?: string;
  }[];
}

export class BatchRemoveOptionalDto {
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  groupIds: string[];
}

export class BatchVisibilityDto {
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @IsObject()
  visibility: {
    aparece_delivery?: boolean;
    aparece_garcom?: boolean;
    aparece_totem?: boolean;
    aparece_tablet?: boolean;
    aparece_mesa?: boolean;
    aparece_comanda?: boolean;
    aparece_tv?: boolean;
  };
}

export class BatchUpdateStatusDto {
  @IsArray()
  @IsUUID('4', { each: true })
  entityIds: string[];

  @IsBoolean()
  active: boolean;
}

export class BatchProductionLocationDto {
  @IsArray()
  @IsUUID('4', { each: true })
  entityIds: string[];

  @IsString()
  productionLocation: string;
}
