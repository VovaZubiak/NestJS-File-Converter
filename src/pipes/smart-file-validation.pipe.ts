import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac',
  'video/mp4', 'video/x-matroska', 'video/quicktime', 'video/x-msvideo',
  'application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

@Injectable()
export class SmartFileValidationPipe implements PipeTransform {
  async transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не завантажено');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`Файл занадто великий. Максимум: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // file-type import
    const { fileTypeFromBuffer } = await import('file-type');
    const detectedType = await fileTypeFromBuffer(file.buffer);

    if (!detectedType || !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
      if (file.mimetype === 'text/plain' && !detectedType) {
        return file;
      }
      throw new BadRequestException(
        `Недопустимий тип файлу! Виявлено: ${detectedType?.mime || 'невідомий'}.`
      );
    }

    return file;
  }
}