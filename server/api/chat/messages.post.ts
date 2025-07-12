import { Chat } from "~/server/models/chat.model";
import { Message } from "~/server/models/message.model";
import mongoose from "mongoose";
import { createDecipheriv } from 'node:crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY is not defined in environment variables');
}

// Функция для дешифровки сообщения
// Функция для дешифровки сообщения
const decryptMessage = (message: any) => {
  // Если сообщение не зашифровано, просто возвращаем его
  if (!message.isEncrypted) {
    return {
      ...message,
      _id: message._id.toString(),
      text: message.text,
      replyTo: message.replyTo ? {
        ...message.replyTo,
        _id: message.replyTo._id.toString()
      } : null
    };
  }

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'base64'),
      Buffer.from(message.iv, 'base64')
    );
    
    // Устанавливаем тег аутентификации перед дешифровкой
    decipher.setAuthTag(Buffer.from(message.authTag, 'base64'));
    
    let decrypted = decipher.update(message.text, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return {
      ...message,
      _id: message._id.toString(),
      text: decrypted,
      replyTo: message.replyTo ? {
        ...message.replyTo,
        _id: message.replyTo._id.toString()
      } : null
    };
  } catch (error) {
    console.error('Decryption error:', error);
    return {
      ...message,
      _id: message._id.toString(),
      text: 'Не удалось расшифровать сообщение',
      replyTo: message.replyTo ? {
        ...message.replyTo,
        _id: message.replyTo._id.toString()
      } : null
    };
  }
};

export default defineEventHandler(async (event) => {
  try {
    await mongoose.connect("mongodb://localhost:27017/Auth");
    const { userId1, userId2, type } = await readBody(event);

    let chat = null;
    console.log( userId1, userId2, type);
    
    
    if (type === "private") {
      const user1Id = new mongoose.Types.ObjectId(userId1);
      const user2Id = new mongoose.Types.ObjectId(userId2);

      chat = await Chat.findOne({
        type: "private",
        members: {
          $size: 2,
          $all: [
            { $elemMatch: { userId: user1Id } },
            { $elemMatch: { userId: user2Id } }
          ]
        }
      });
  
      if (!chat) {
        chat = await Chat.create({
          type: "private",
          members: [
            { userId: user1Id, role: "member" },
            { userId: user2Id, role: "member" }
          ]
        });
      }
    } else if (type === "group") {
      chat = await Chat.findOne({ 
        _id: new mongoose.Types.ObjectId(userId2),
        type: "group"
      });
      
      if (!chat) {
        throw new Error("Group chat not found");
      }
    } else {
      throw new Error("Invalid chat type");
    }

    const encryptedMessages = await Message.find({ chatId: chat._id })
      .populate("replyTo")
      .sort({ createdAt: 1 })
      .lean();


    const messages = encryptedMessages.map(decryptMessage);
    
    return { 
      chat: {
        ...chat.toObject(),
        _id: chat._id.toString(),
        members: chat.members.map(m => ({
          ...m,
          userId: m.userId.toString()
        }))
      },
      messages 
    };
  } catch (e) {
    console.error('Error in chat handler:', e);
    return { 
      error: e.message,
      statusCode: e instanceof mongoose.Error.ValidationError ? 400 : 500
    };
  }
});