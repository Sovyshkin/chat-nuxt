import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import { defineEventHandler } from "h3";
import { Chat } from "../models/chat.model";
import { Message } from "~/server/models/message.model";
import { User } from "~/server/models/user.model";
import mongoose from "mongoose";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is not defined in environment variables");
}

const ALGORITHM = "aes-256-gcm";

export default defineNitroPlugin(async (nitroApp: NitroApp) => {
  const engine = new Engine();
  const io = new Server({
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  await mongoose.connect("mongodb://localhost:27017/Auth");

  let clients = new Map();

  const encryptMessage = (text: string) => {
    const iv = randomBytes(16); // 128 бит для GCM
    const cipher = createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, "base64"),
      iv
    );

    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");

    const authTag = cipher.getAuthTag().toString("base64");

    return {
      encrypted,
      iv: iv.toString("base64"),
      authTag,
    };
  };

  const decryptMessage = (
    encryptedText: string,
    iv: string,
    authTag: string
  ) => {
    const decipher = createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, "base64"),
      Buffer.from(iv, "base64")
    );

    decipher.setAuthTag(Buffer.from(authTag, "base64"));

    let decrypted = decipher.update(encryptedText, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  };

  const getMessages = async (userId1, userId2, type) => {
    try {
      let response = await $fetch("/api/chat/messages", {
        method: "POST",
        body: {
          userId1,
          userId2,
          type,
        },
      });

      console.log(userId1, userId2, type);
      return response;
    } catch (err) {
      console.log(err);
    }
  };

  const getChats = async (userId: string) => {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      const [personalChats, groupChats] = await Promise.all([
        User.find({ _id: { $ne: userObjectId } }).lean(),
        Chat.find({
          type: "group",
          members: { $elemMatch: { userId: userObjectId } },
        }).lean(),
      ]);

      return [
        ...groupChats.map((chat) => ({
          _id: chat._id.toString(),
          name: chat.title,
          type: "group" as const,
          online: false,
          notification: false,
          members: chat.members.map((m) => m.toString()),
        })),
        ...personalChats.map((chat) => ({
          _id: chat._id.toString(),
          name: chat.name || chat.username,
          type: "private" as const,
          online: false,
          notification: false,
        })),
      ];
    } catch (err) {
      console.error("Ошибка при загрузке чатов:", err);
      return [];
    }
  };

  const getChat = async (id: string) => {
    return await Chat.findOne({ _id: id });
  };

  io.bind(engine);

  io.on("connection", async (socket) => {
    socket.on("logined", async (data) => {
      try {
        clients.set(data.userId1, socket.id);
        io.emit("online", Array.from(clients.keys()));
        const chats = await getChats(data.userId1)
        socket.emit("chats", chats);
        if (data.userId2 && data.type) {
          const messagesResp = await getMessages(data.userId1, data.userId2, data.type)
          socket.emit("messages", messagesResp.messages);
        }
      } catch (error) {
        console.error("Login error:", error);
      }
    });

    socket.on("new message", async (data) => {
      try {
        const { encrypted, iv, authTag } = encryptMessage(data.text);

        const message = new Message({
          text: encrypted,
          iv,
          authTag,
          isEncrypted: true,
          senderId: data.senderId,
          senderName: data.senderName,
          chatId: data.chatId,
          replyTo: data.replyId,
        });

        await message.save();

        const { chat, messages } = await getMessages(
          data.userId1,
          data.userId2,
          data.type
        );

        socket.emit("messages", messages)

        chat.members.forEach((client) => {
          const clientSocketId = clients.get(client.userId.toString());
          if (clientSocketId) {
            socket.to(clientSocketId).emit("messages", messages);
          }
        });
      } catch (error) {
        console.error("Message processing error:", error);
      }
    });

    socket.on("delete message", async (data) => {
      try {
        await Message.deleteOne({ _id: data.messageId });
        let resp = await getMessages(
          data.userId1,
          data.userId2,
          data.type
        );
      
        socket.emit("messages", resp.messages)
        const chat = await getChat(data.chatId);
        if (chat) {
          chat.members.forEach((client) => {
            const clientSocketId = clients.get(client.userId.toString());
            if (clientSocketId) {
              socket.to(clientSocketId).emit("messages", resp.messages);
            }
          });
        }
      } catch (error) {
        console.error("Delete message error:", error);
      }
    });

    socket.on("create group", async (data) => {
      try {
        const members = data.members.map((userId) => ({
          userId: new mongoose.Types.ObjectId(userId),
          role: userId === data.creatorId ? "creator" : "member",
        }));

        const group = new Chat({
          type: "group",
          title: data.title,
          members,
          creatorId: data.creatorId,
        });

        await group.save();

        let chatsUser = await getChats(data.creatorId)
        socket.emit('chats', chatsUser)

        data.members.forEach(async (id) => {
          const clientSocketId = clients.get(id);
          if (clientSocketId) {
            const chats = await getChats(id);
            socket.to(clientSocketId).emit("chats", chats);
          }
        });
      } catch (error) {
        console.error("Create group error:", error);
      }
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of clients.entries()) {
        if (socketId === socket.id) {
          clients.delete(userId);
          io.emit("online", Array.from(clients.keys()));
          break;
        }
      }
    });
  });

  nitroApp.router.use(
    "/socket.io/",
    defineEventHandler({
      handler(event) {
        engine.handleRequest(event.node.req, event.node.res);
        event._handled = true;
      },
      websocket: {
        open(peer) {
          engine.prepare(peer._internal.nodeReq);
          engine.onWebSocket(
            peer._internal.nodeReq,
            peer._internal.nodeReq.socket,
            peer.websocket
          );
        },
      },
    })
  );
});
