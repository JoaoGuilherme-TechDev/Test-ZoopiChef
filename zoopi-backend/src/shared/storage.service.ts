/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { join, extname } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

@Injectable()
export class StorageService {
  private readonly uploadPath = join(process.cwd(), 'uploads');

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'others',
  ): Promise<string> {
    try {
      // 1. Criar o caminho da pasta (ex: uploads/avatars)
      const targetPath = join(this.uploadPath, folder);

      if (!existsSync(targetPath)) {
        await mkdir(targetPath, { recursive: true });
      }

      // 2. Gerar um nome único para o arquivo para evitar sobreposição
      const fileHash = randomBytes(8).toString('hex');
      const timestamp = Date.now();
      const extension = extname(file.originalname);
      const fileName = `${fileHash}-${timestamp}${extension}`;

      const filePath = join(targetPath, fileName);

      // 3. Salvar o arquivo no disco
      await writeFile(filePath, file.buffer);

      // 4. Retornar o caminho relativo para ser acessado via URL
      // No futuro, isso pode retornar a URL do S3 ou Cloudinary
      return `/uploads/${folder}/${fileName}`;
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao salvar o arquivo no servidor.',
      );
    }
  }
}
