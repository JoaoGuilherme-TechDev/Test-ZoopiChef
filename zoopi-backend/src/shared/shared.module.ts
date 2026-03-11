import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [EncryptionService, StorageService],
  exports: [EncryptionService, StorageService],
})
export class SharedModule {}
