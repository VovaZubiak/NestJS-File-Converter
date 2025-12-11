import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AppService {
  private uploadDir = path.resolve('./uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir);
    }
  }

  async processFile(file: Express.Multer.File, targetFormat: string): Promise<string> {
    const fileId = uuidv4();
    //Clearing the file name from Cyrillic and spaces 
    const safeName = fileId + path.extname(file.originalname);
    const inputPath = path.join(this.uploadDir, safeName);
    
    fs.writeFileSync(inputPath, file.buffer);

    return new Promise((resolve, reject) => {
      // Python logic start
      const pythonProcess = spawn('py', [
        'converter.py',
        inputPath,
        targetFormat
      ]);

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        // Cleanup
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

        if (code !== 0) {
            console.error(`Python Error: ${errorData}`);
            reject(new InternalServerErrorException('Помилка конвертації: ' + errorData));
        } else {
            resolve(outputData.trim());
        }
      });
    });
  }
}