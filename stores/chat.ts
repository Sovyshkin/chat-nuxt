import { defineStore } from "pinia";
import { io } from "socket.io-client";

export const useChatStore = defineStore(
  "chat",
  () => {
    const socket = ref(null);
    const isLoading = ref(false);
    const empty = ref(true);
    const content = ref("");
    const username = ref("");
    const userID = ref("");
    const chatLoader = ref(false);
    const messages = ref([]);
    const chats = ref([]);
    const clients = ref([]);
    const selectedChat = ref("");
    const chat = ref(null);
    let online = [];
    const notification = ref(false);
    const replyId = ref(null);
    const users = ref([]);
    const files = ref([]);
    const showChats = ref(false);
    const showChatsPred = ref(true);
    const user = ref({})

    const addMessage = async () => {
      try {
        chatLoader.value = true;
        userID.value = user.value._id;
        console.log(files.value);

        // Если есть файлы для загрузки
        if (files.value && files.value.length > 0) {
          const formData = new FormData();

          // Добавляем все файлы в FormData
          files.value.forEach((file) => {
            formData.append("files", file);
          });

          // Добавляем метаданные сообщения
          formData.append("text", content.value);
          formData.append("senderId", userID.value);
          formData.append("senderName", user.value.name);
          formData.append("chatId", chat.value._id);
          formData.append("userId1", user.value._id);
          formData.append("userId2", selectedChat.value._id);
          formData.append("replyId", replyId.value || "");
          formData.append("type", chat.value.type);

          let response = await $fetch("/api/messages/files", {
            method: "POST",
            body: formData,
          });

          if (socket.value) {
            socket.value.emit("new message with files", formData);
          }
        } else {
          // Обычное текстовое сообщение
          if (socket.value) {
            socket.value.emit("new message", {
              text: content.value,
              senderId: userID.value,
              senderName: user.value.name,
              chatId: chat.value._id,
              userId1: user.value._id,
              userId2: selectedChat.value._id,
              replyId: replyId.value,
              type: chat.value.type,
            });
          }
        }
        content.value = "";
        replyId.value = null;
        files.value = [];
      } catch (err) {
        console.error("Ошибка при отправке сообщения:", err);
      } finally {
        chatLoader.value = false;
      }
    };

    const deleteMessage = async (messageId) => {
      try {
        chatLoader.value = true;
        userID.value = user.value._id;
        if (socket.value) {
          socket.value.emit("delete message", {
            messageId,
            userId1: user.value._id,
            userId2: selectedChat.value._id,
            chatId: chat.value._id,
          });
        }
      } catch (err) {
        console.log(err);
      } finally {
        chatLoader.value = false;
      }
    };

    const createGroup = async (data) => {
      try {
        if (socket.value) {
          let members = data.members;
          members.push(user.value._id);
          socket.value.emit("create group", {
            title: data.title,
            members: members,
            creatorId: user.value._id,
          });
        }
      } catch (error) {
        console.error("Ошибка при создании группы:", error);
        throw error;
      }
    };

    const goCreateGroup = async () => {
      try {
        isLoading.value = true;
        users.value = await $fetch(`api/users/get?id=${user.value._id}`);
      } catch (err) {
        console.log(err);
      } finally {
        isLoading.value = false;
      }
    };

    const connect = () => {
      if (process.client) {
        userID.value = user.value._id;

        socket.value = io("http://localhost:3001", { // https://saluence.net http://localhost:3000
          path: "/socket.io/",
          transports: ["websocket"],
        });

        socket.value.emit("logined", {
          userId1: user.value._id,
          userId2: selectedChat.value._id,
          type: selectedChat.value.type,
        });

        socket.value.on("messages", (data) => {
          messages.value = data;
          if (data) {
            empty.value = false;
          }
        });

        socket.value.on("chats", (data) => {
          clients.value = data || [];
        });
        socket.value.on("online", (data) => {
          online = data || [];

          online.forEach((item) => {
            for (let client of clients.value) {
              if (item == client._id) {
                client.online = true;
              }
            }
          });

          // console.log(online.value);
        });

        socket.value.on("notification", (id) => {
          for (let client of clients.value) {
            if (client._id == id) {
              client.notification = true;
            }
          }
        });
      }
    };

    const disconnect = () => {
      if (socket.value) {
        socket.value.disconnect();
        socket.value = null;
      }
    };

    const openChat = async (userChat) => {
      try {
        selectedChat.value = userChat;
        showChats.value = false;
        showChatsPred.value = false;
        let response = await $fetch("/api/chat/messages", {
          method: "POST",
          body: {
            userId1: user.value._id,
            userId2: userChat._id,
            type: userChat.type,
          },
        });
        chat.value = response.chat;
        messages.value = response.messages;
        clients.value = clients.value.map((client) => {
          if (client._id === selectedChat.value._id) {
            return { ...client, notification: false }; // Создаём новый объект
          }
          return client;
        });
      } catch (err) {
        console.log(err);
      }
    };

    const openAllChats = () => {
      try {
        showChatsPred.value = true;
        setTimeout(() => {
          showChats.value = true;
          showChatsPred.value = false;
        }, 300);
      } catch (err) {
        console.log(err);
      }
    };

    const checkOnline = (name) => {
      try {
        return online.includes(name);
      } catch (err) {
        console.log(err);
      }
    };

    return {
      user,
      showChats,
      showChatsPred,
      files,
      goCreateGroup,
      users,
      createGroup,
      replyId,
      deleteMessage,
      chat,
      checkOnline,
      selectedChat,
      openChat,
      clients,
      chats,
      isLoading,
      chatLoader,
      empty,
      addMessage,
      content,
      messages,
      connect,
      disconnect,
      userID,
      notification,
      openAllChats,
    };
  },
  { persist: true }
);
