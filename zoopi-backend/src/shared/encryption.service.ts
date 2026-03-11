/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret || secret.length < 32) {
      throw new Error(
        'ENCRYPTION_KEY no .env deve ter pelo menos 32 caracteres.',
      );
    }
    // Garante que a chave tenha 32 bytes para o aes-256
    this.key = scryptSync(secret, 'zoopi-salt', 32);
  }

  /**
   * Criptografa uma string (ex: Conteúdo do Certificado A1 ou Senha)
   * Retorna um formato: iv:content:authTag (tudo em hex)
   */
  encrypt(text: string): string {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, this.key, iv);

      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao criptografar dados sensíveis.',
      );
    }
  }

  /**
   * Descriptografa a string retornando o valor original
   */
  decrypt(hash: string): string {
    try {
      const [ivHex, encryptedHex, authTagHex] = hash.split(':');

      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao descriptografar dados. Chave incorreta ou dado corrompido.',
      );
    }
  }
}
