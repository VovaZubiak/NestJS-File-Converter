import { 
  Controller, Post, UploadedFile, UseInterceptors, Body, BadRequestException, Res 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AppService } from './app.service';
import { SmartFileValidationPipe } from './pipes/smart-file-validation.pipe';
import * as fs from 'fs';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('convert')
  @UseInterceptors(FileInterceptor('file'))
  async convertFile(
    @UploadedFile(new SmartFileValidationPipe()) file: Express.Multer.File,
    @Body('format') targetFormat: string,
    @Body('category') category: string,
    @Res() res: Response
  ) {
    if (!targetFormat || !category) {
      throw new BadRequestException('Не вказано формат або категорію');
    }

    console.log(`Log: Category=${category}, MimeType=${file.mimetype}`);

    this.validateCategoryLogic(file.mimetype, category);
    // ------------------------------

    try {
      const convertedFilePath = await this.appService.processFile(file, targetFormat);

      res.download(convertedFilePath, (err) => {
        if (err) console.error(err);
        if (fs.existsSync(convertedFilePath)) fs.unlinkSync(convertedFilePath);
      });

    } catch (error) {
      const status = error instanceof BadRequestException ? 400 : 500;
      res.status(status).json({ message: error.message });
    }
  }

  private validateCategoryLogic(mimeType: string, category: string) {
    const rules = {
      image: ['image/'],
      video: ['video/'],
      audio: ['audio/'],
      document: ['application/pdf', 'text/', 'application/vnd', 'application/msword']
    };

    const allowedPrefixes = rules[category];

    if (!allowedPrefixes) {
      throw new BadRequestException('Невідома категорія');
    }

    const isValid = allowedPrefixes.some(prefix => mimeType.startsWith(prefix));

    if (!isValid) {
      throw new BadRequestException(
        `Помилка логіки: Ви намагаєтесь завантажити файл типу "${mimeType}" у категорію "${category.toUpperCase()}". Це заборонено.`
      );
    }
  }
}