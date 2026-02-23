import { PartialType } from '@nestjs/mapped-types';
import { CreateOptionalGroupDto } from './create-optional-group.dto';

export class UpdateOptionalGroupDto extends PartialType(CreateOptionalGroupDto) {}
