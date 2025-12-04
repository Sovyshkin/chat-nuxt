import { Message } from "~/server/models/message.model.ts";
import mongoose from "mongoose";
import fs from 'fs';
import path from 'path';

// Путь к папке загрузок внутри public
const publicUploadDir = path.join(process.cwd(), 'public', 'uploads');

// Создаем папку для загрузок, если её нет
if (!fs.existsSync(publicUploadDir)) {
  fs.mkdirSync(publicUploadDir, { recursive: true });
}

export default defineEventHandler(async (event) => {
  try {
    await mongoose.connect("mongodb://localhost:27017/Auth");

    // Обработка сообщений с файлами
    const formData = await readMultipartFormData(event);
    
    // Парсим FormData
    const fields: Record<string, any> = {};
    const files: any[] = [];
    
    for (const part of formData) {
      if (part.name) {
        if (part.filename) {
          // Генерируем уникальное имя файла для хранения
          const uniqueFilename = `${Date.now()}-${part.filename}`;
          // Сохраняем оригинальное имя для отображения
          const originalFilename = part.filename;
          const filePath = path.join(publicUploadDir, uniqueFilename);
          
          // Сохраняем файл
          fs.writeFileSync(filePath, part.data);
          
          // Добавляем информацию о файле
          files.push({
            name: part.name,
            filename: originalFilename, // Используем оригинальное имя
            type: part.type,
            path: filePath,
            publicUrl: `/uploads/${uniqueFilename}`, // URL для доступа из браузера
            size: part.data.length
          });
        } else {
          // Это текстовое поле
          fields[part.name] = part.data.toString('utf-8');
        }
      }
    }

    // Определяем тип файла на основе MIME type
    const getMediaType = (mimeType: string) => {
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType.startsWith('video/')) return 'video';
      if (mimeType.startsWith('audio/')) return 'audio';
      if (mimeType === 'application/octet-stream') return 'document';
      return 'document'; // fallback
    };

    // Создаем новое сообщение с файлами
    const newMessage = new Message({
      text: fields.text,
      senderId: fields.senderId,
      senderName: fields.senderName,
      chatId: fields.chatId,
      replyTo: fields.replyId || null,
      media: files.map(file => ({
        type: getMediaType(file.type),
        url: file.publicUrl, // Используем public URL вместо локального пути
        filename: file.filename,
        size: file.size,
        duration: fields.duration || null,
        width: fields.width || null,
        height: fields.height || null,
        thumbnail: fields.thumbnail || null,
        caption: fields.caption || null
      }))
    });

    await newMessage.save();

    return { 
      success: true,
      message: newMessage,
      files: files.map(f => ({
        name: f.filename,
        size: f.size,
        type: f.type,
        url: f.publicUrl // Возвращаем public URL клиенту
      }))
    };

  } catch (e) {
    console.error(e);
    return createError({ 
      statusCode: 500, 
      statusMessage: 'Internal Server Error',
      data: e.message 
    });
  }
});