import { PartialType } from '@nestjs/mapped-types';
import { CreateFlavorGroupDto } from './create-flavor-group.dto';

export class UpdateFlavorGroupDto extends PartialType(CreateFlavorGroupDto) {}
