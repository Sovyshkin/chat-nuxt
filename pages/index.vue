<script setup>
import { ref, watch, nextTick, onMounted, computed } from "vue";
import AppLoader from "@/components/AppLoader.vue";
import ChatLoader from "@/components/ChatLoader.vue";
import AppEmpty from "@/components/AppEmpty.vue";

const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const selectedMessage = ref(null);
const contextMenuWidth = 160; // Ширина контекстного меню
const contextMenuHeight = 120; // Примерная высота контекстного меню
let data = {};

// Функция для показа контекстного меню
const showContextMenu = (event, message) => {
  event.preventDefault();
  selectedMessage.value = message;

  // Получаем размеры окна
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // Рассчитываем позицию с учетом границ экрана
  let x = event.clientX;
  let y = event.clientY;

  // Проверяем правую границу
  if (x + contextMenuWidth > windowWidth) {
    x = windowWidth - contextMenuWidth - 10; // 10px отступ от края
  }

  // Проверяем нижнюю границу
  if (y + contextMenuHeight > windowHeight) {
    y = windowHeight - contextMenuHeight - 10; // 10px отступ от края
  }

  contextMenuPosition.value = { x, y };
  contextMenuVisible.value = true;
};
// Функция для скрытия меню
const hideContextMenu = () => {
  contextMenuVisible.value = false;
};

// Добавляем обработчики после монтирования компонента
onMounted(async () => {
  document.addEventListener("click", hideContextMenu);
});

// Удаляем обработчики перед размонтированием
onBeforeUnmount(() => {
  document.removeEventListener("click", hideContextMenu);
});

// Копирование текста сообщения
const copyMessage = (message) => {
  navigator.clipboard
    .writeText(message.text)
    .then(() => {
      // Можно добавить уведомление об успешном копировании
      console.log("Текст скопирован");
    })
    .catch((err) => {
      console.error("Ошибка при копировании:", err);
    });
  contextMenuVisible.value = false;
};

// Ответ на сообщение
const replyToMessage = (message) => {
  chatStore.replyId = message._id;
  contextMenuVisible.value = false;
  // Можно добавить фокус на поле ввода
  document.querySelector(".group-item")?.focus();
};

// Удаление сообщения
const deleteMessage = async (message) => {
  if (confirm("Вы уверены, что хотите удалить это сообщение?")) {
    try {
      await chatStore.deleteMessage(message._id);
    } catch (err) {
      console.error("Ошибка при удалении сообщения:", err);
    }
  }
  contextMenuVisible.value = false;
};

const cancelReply = () => {
  chatStore.replyId = null;
};

// Метод для получения текста сообщения, на которое отвечаем
const getRepliedMessageText = (replyId) => {
  const repliedMessage = chatStore.messages.find((msg) => msg._id === replyId);
  return repliedMessage?.text || "Сообщение удалено";
};

const chatStore = useChatStore();
chatStore.connect();

const messagesContainer = ref(null); // Создаем ref для контейнера сообщений
// const toast = useToast()

const handleEnter = (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatStore.addMessage();
  }
};

// Функция для прокрутки к последнему сообщению
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: "smooth",
      });
    }
  });
};

const scrollToRepliedMessage = (replyToId) => {
  const repliedMessageElement = document.querySelector(
    `[data-message-id="${replyToId}"]`
  );
  if (repliedMessageElement) {
    repliedMessageElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    repliedMessageElement.classList.add("highlight-replied");
    setTimeout(
      () => repliedMessageElement.classList.remove("highlight-replied"),
      2000
    );
  }
};

// Добавляем ref для хранения выбранных файлов
const fileInput = ref(null);

// Функция для открытия диалога выбора файлов
const openFilePicker = () => {
  fileInput.value.click();
};

// Обработчик выбора файлов
const handleFileSelect = (event) => {
  const selectedFiles = Array.from(event.target.files);

  // Проверяем размер файлов (например, не более 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  const validFiles = selectedFiles.filter((file) => file.size <= maxSize);

  if (validFiles.length !== selectedFiles.length) {
    alert("Некоторые файлы превышают максимальный размер (10MB)");
  }

  chatStore.files = [...chatStore.files, ...validFiles];
  event.target.value = ""; // Сбрасываем input для возможности повторного выбора тех же файлов
};

// Удаление файла из списка перед отправкой
const removeFile = (index) => {
  chatStore.files.splice(index, 1);
};

// Определяем тип файла для отображения соответствующего значка
const fileTypeIcon = computed(() => {
  return (file) => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "document";
  };
});

// Добавляем computed для определения типа медиа
const mediaType = (media) => {
  if (media.type === "image") return "image";
  if (media.type === "video") return "video";
  if (media.type === "audio") return "audio";
  if (media.type === "voice") return "voice";
  return "document";
};

// Функция для форматирования длительности
const formatDuration = (seconds) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

// Функция для форматирования размера файла
const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Добавляем состояние для полноэкранного просмотра
const fullscreenImage = ref({
  visible: false,
  url: "",
  caption: "",
});

// Функция для открытия изображения на весь экран
const openFullscreenImage = (url, caption = "") => {
  fullscreenImage.value = {
    visible: true,
    url,
    caption,
  };
  // Блокируем прокрутку фона
  document.body.style.overflow = "hidden";
};

// Функция для закрытия полноэкранного режима
const closeFullscreenImage = () => {
  fullscreenImage.value.visible = false;
  // Восстанавливаем прокрутку фона
  document.body.style.overflow = "";
};

const auth = async () => {
  try {
    window.addEventListener("message", (event) => {
      event.source.postMessage({ status: "success" }, event.origin);
      // Проверяем origin отправителя для безопасности
      if (event.origin !== "http://localhost:3000") return;

      data = event.data;
      console.log("Получены данные:", data);
    });
  } catch (err) {}
};

onMounted(async () => {
  await auth();
  nextTick(() => {
    scrollToBottom();
    // Добавляем дополнительную проверку через setTimeout
    setTimeout(scrollToBottom, 300);
  });
});

watch(
  () => chatStore.messages,
  () => {
    chatStore.isLoading = false;
    nextTick(() => {
      scrollToBottom();
      // Дополнительная проверка для асинхронно загружаемых медиа
      setTimeout(scrollToBottom, 500);
    });
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <div class="wrapper">
    {{ data }}
    <div
      class="menu mobile"
      v-if="!chatStore.showChats"
      @click="chatStore.openAllChats()"
    >
      <img class="menu-img" src="../assets/menu.png" alt="" />
    </div>
    <AllChats class="desk" />
    <transition name="fadeChats" class="mobile">
      <AllChats v-if="chatStore.showChats" />
    </transition>
    <div
      v-if="fullscreenImage?.visible"
      class="fullscreen-image-overlay"
      @click.self="closeFullscreenImage"
    >
      <div class="fullscreen-image-container">
        <button class="close-button" @click="closeFullscreenImage">×</button>
        <img :src="fullscreenImage.url" class="fullscreen-image" />
        <div v-if="fullscreenImage.caption" class="fullscreen-caption">
          {{ fullscreenImage.caption }}
        </div>
      </div>
    </div>
    <transition name="fadeChatContainer">
      <div class="chat" v-if="!chatStore.showChats">
        <div
          class="messages"
          v-if="!chatStore?.empty && !chatStore?.isLoading"
          ref="messagesContainer"
        >
          <div
            class="wrap-message"
            v-for="message in chatStore.messages"
            :key="message._id"
            :class="{ user: message.senderId == chatStore.userID }"
            :data-message-id="message._id"
            @contextmenu.prevent="showContextMenu($event, message)"
            @click="hideContextMenu"
          >
            <div
              class="group-message"
              :class="{
                userGroupMessage: message.senderId == chatStore.userID,
              }"
            >
              <!-- Блок с ответом на сообщение (если есть replyTo) -->
              <div
                class="reply-preview"
                v-if="message.replyTo"
                @click="scrollToRepliedMessage(message.replyTo._id)"
              >
                <div class="reply-info">
                  <span class="reply-label">The answer to:</span>
                  <span class="reply-sender">
                    {{ message.replyTo.senderName }}
                  </span>
                </div>
                <div class="reply-text">
                  {{ message.replyTo.text }}
                </div>
              </div>
              <!-- Блок с медиафайлами -->
              <div
                class="media-container"
                v-if="message.media && message.media.length"
              >
                <div
                  v-for="media in message.media"
                  :key="media.url"
                  class="media-item"
                  :class="{ userMedia: message.senderId == chatStore.userID }"
                >
                  <!-- Фото -->
                  <div v-if="mediaType(media) === 'image'" class="media-photo">
                    <img
                      :src="media.url"
                      :alt="media.caption"
                      @click="openFullscreenImage(media.url, media.caption)"
                    />
                    <div v-if="media.caption" class="media-caption">
                      {{ media.caption }}
                    </div>
                  </div>

                  <!-- Видео -->
                  <div v-if="mediaType(media) === 'video'" class="media-video">
                    <video controls :poster="media.thumbnail">
                      <source
                        :src="media.url"
                        :type="'video/' + media.url.split('.').pop()"
                      />
                    </video>
                    <div class="video-info">
                      <span v-if="media.duration" class="duration">{{
                        formatDuration(media.duration)
                      }}</span>
                      <div v-if="media.caption" class="media-caption">
                        {{ media.caption }}
                      </div>
                    </div>
                  </div>

                  <!-- Аудио -->
                  <div v-if="mediaType(media) === 'audio'" class="media-audio">
                    <audio controls>
                      <source
                        :src="media.url"
                        :type="'audio/' + media.url.split('.').pop()"
                      />
                    </audio>
                    <div class="audio-info">
                      <span>{{ media.filename }}</span>
                      <span>{{ formatFileSize(media.size) }}</span>
                    </div>
                  </div>

                  <!-- Голосовое сообщение -->
                  <div v-if="mediaType(media) === 'voice'" class="media-voice">
                    <div class="voice-wave">
                      <div class="wave"></div>
                      <div class="wave"></div>
                      <div class="wave"></div>
                    </div>
                    <audio controls>
                      <source :src="media.url" type="audio/ogg" />
                    </audio>
                    <span class="duration">{{
                      formatDuration(media.duration)
                    }}</span>
                  </div>

                  <!-- Документ -->
                  <div
                    v-if="mediaType(media) === 'document'"
                    class="media-document"
                  >
                    <div class="document-icon">
                      <img
                        src="../assets/file-types/document.png"
                        alt="Документ"
                      />
                    </div>
                    <div class="document-info">
                      <div class="filename">{{ media.filename }}</div>
                      <div class="file-size">
                        {{ formatFileSize(media.size) }}
                      </div>
                    </div>
                    <a :href="media.url" download class="download-btn">
                      <img src="../assets/download.png" alt="Скачать" />
                    </a>
                  </div>
                </div>
              </div>
              <div
                class="message"
                v-html="message.text"
                :class="{ userMessage: message.senderId == chatStore.userID }"
              ></div>
              <div class="avatar">
                <img
                  src="../assets/image.png"
                  alt=""
                  v-if="message.userID == chatStore.userID"
                />
                <img src="../assets/gpt.svg" alt="" v-else />
              </div>
              <div
                class="username"
                :class="{ me: message.senderId == chatStore.userID }"
              >
                {{ message.senderName }}
              </div>
            </div>
          </div>
          <!-- Контекстное меню -->
          <div
            v-if="contextMenuVisible"
            class="context-menu"
            :style="{
              top: `${contextMenuPosition.y}px`,
              left: `${contextMenuPosition.x}px`,
            }"
            @click.stop
          >
            <div
              class="context-menu-item"
              @click="replyToMessage(selectedMessage)"
            >
              <img
                src="../assets/reply.png"
                alt="Ответить"
                class="context-menu-icon"
              />
              <span>To answer</span>
            </div>
            <div
              class="context-menu-item"
              @click="copyMessage(selectedMessage)"
            >
              <img
                src="../assets/copy.png"
                alt="Копировать"
                class="context-menu-icon"
              />
              <span>Copy</span>
            </div>
            <div
              class="context-menu-item danger"
              v-if="selectedMessage?.senderId == chatStore.userID"
              @click="deleteMessage(selectedMessage)"
            >
              <img
                src="../assets/delete.png"
                alt="Удалить"
                class="context-menu-icon"
              />
              <span>Delete</span>
            </div>
          </div>
        </div>
        <AppEmpty v-if="chatStore.empty" />
        <ChatLoader class="left" v-if="chatStore.chatLoader" />
        <div class="group-send">
          <!-- Блок с превью выбранных файлов -->
          <transition-group name="slide-down" tag="div" class="files-preview">
            <div
              v-for="(file, index) in chatStore.files"
              :key="file.name + index"
              class="file-item"
            >
              <div class="file-info">
                <img
                  :src="`../assets/file-types/${fileTypeIcon(file)}.png`"
                  alt=""
                  class="file-icon"
                />
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size"
                  >{{ (file.size / 1024 / 1024).toFixed(2) }}MB</span
                >
              </div>
              <button @click="removeFile(index)" class="remove-file">×</button>
            </div>
          </transition-group>

          <!-- Блок с информацией о сообщении, на которое отвечаем -->
          <transition name="slide-down">
            <div class="reply-preview" v-if="chatStore.replyId">
              <div class="reply-info">
                <span>Reply to the message:</span>
                <button @click="cancelReply" class="cancel-reply">×</button>
              </div>
              <div class="reply-text">
                {{ getRepliedMessageText(chatStore.replyId) }}
              </div>
            </div>
          </transition>
          <div class="wrap-send">
            <button @click="openFilePicker" class="attach-button">
              <img src="../assets/attach.png" alt="Прикрепить файл" />
            </button>
            <!-- Скрытый input для выбора файлов -->
            <input
              type="file"
              ref="fileInput"
              @change="handleFileSelect"
              multiple
              style="display: none"
            />
            <input
              type="text"
              class="group-item"
              v-model="chatStore.content"
              @keydown.enter="handleEnter"
              placeholder="Start writing..."
            />
            <img
              class="send"
              src="../assets/send.svg"
              @click="chatStore.addMessage"
              alt=""
              v-if="!chatStore.isLoading"
            />
          </div>
          <AppLoader v-if="chatStore.isLoading" />
        </div>
      </div>
    </transition>
  </div>
</template>
<style scoped>
.wrapper {
  display: flex;
  position: relative;
  overflow: hidden;
}

.menu {
  display: none;
  position: absolute;
  top: 10px;
  left: 20px;
  z-index: 4;
  background-color: #fff;
  padding: 5px 7px;
  border-radius: 10px;
  box-shadow: rgba(149, 157, 165, 0.2) 0px 8px 24px;
  cursor: pointer;
  transition: all 500ms ease;
}

@media (max-width: 720px) {
  .mobile {
    display: block;
  }

  .desk {
    display: none;
  }
}

.menu-img {
  height: 36px;
}

.menu:hover {
  box-shadow: none;
}

h1 {
  text-align: center;
  font-weight: 600;
  font-size: 25px;
  line-height: 30px;
  padding: 20px 0;
}

input[type="file"] {
  border: none;
  display: none;
}

.group-file {
  display: flex;
  align-items: center;
  justify-content: center;
}

label {
  width: 100%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.messages::-webkit-scrollbar {
  width: 0;
}

.wrap-message {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.user {
  justify-content: flex-end;
}

.group-message {
  position: relative;
  width: 100%;
  display: flex;
  align-items: start;
  justify-content: start;
  gap: 10px;
  flex-direction: row-reverse;
  padding-right: 38px;
  padding-left: 0;
}

.userGroupMessage {
  flex-direction: row;
  padding-left: 38px;
  padding-right: 0;
  justify-content: end;
}

.message {
  max-width: 600px;
  width: fit-content;
  background-color: #e6eefe;
  padding: 20px;
  border-radius: 4px 12px 12px 12px;
}
.userMessage {
  background-color: #fff;
  border-radius: 12px 4px 12px 12px;
}

.group-item {
  line-height: 22px;
  font-size: 14px;
  width: 100%;
  outline: none;
}

.wrap-send {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  padding: 5px;
  background-color: #fff;
}

.send {
  cursor: pointer;
  transition: all 500ms ease;
  width: 30px;
  width: 30px;
}

.send:hover {
  transform: translateY(-3px);
}
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  overflow: hidden; /* Обрезает изображение, если оно выходит за пределы блока */
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0; /* Фон на случай, если изображение не загрузится */
  box-sizing: border-box;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  display: block; /* Убирает лишние пробелы */
  border: none; /* Убирает возможные границы */
  padding: 0; /* Убирает возможные отступы */
  margin: 0;
}

.doc {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.info {
  display: flex;
  flex-direction: column;
}

.name {
  font-weight: 500;
  font-size: 12px;
  line-height: 16.8px;
}

.left {
  width: 100%;
  display: flex;
  justify-content: start;
  padding-left: 20px;
}

.username {
  position: absolute;
  width: fit-content;
  top: -20px;
  left: 0;
  right: 0;
  text-align: center;
  z-index: 10;
  font-weight: 500;
  font-size: 12px;
  line-height: 16.8px;
  color: black;
}

.me {
  left: auto;
  right: 0;
  transform: none;
}

/* Добавляем стили для контекстного меню */
.context-menu {
  position: fixed;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 160px;
  overflow: hidden;
  animation: fadeIn 0.1s ease-out;
}

.context-menu-item {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.context-menu-item:hover {
  background-color: #f5f5f5;
}

.context-menu-item.danger {
  color: #ff3b30;
}

.context-menu-item.danger:hover {
  background-color: #ffebee;
}

.context-menu-icon {
  width: 16px;
  height: 16px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.reply-preview {
  width: 100%;
  max-width: 500px;
  margin-bottom: 8px;
  padding: 8px 12px;
  background-color: #f0f4ff;
  border-left: 3px solid #4a6bff;
  border-radius: 4px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reply-preview:hover {
  background-color: #e6ecff;
}

.reply-info {
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #777;
}

.reply-label {
  font-weight: 500;
}

.reply-sender {
  font-weight: 600;
  color: #4a6bff;
}

.reply-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.highlight-replied {
  background-color: rgba(194, 195, 200, 0.1);
  transition: background-color 0.3s;
}

/* Стили для блока ответа */
.reply-preview {
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 8px;
  background-color: #f0f4ff;
  border-left: 3px solid #4a6bff;
  border-radius: 4px;
  position: relative;
}

.reply-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 12px;
  color: #777;
}

.reply-text {
  font-size: 13px;
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cancel-reply {
  background: none;
  border: none;
  color: #777;
  font-size: 16px;
  cursor: pointer;
  padding: 0 5px;
}

.cancel-reply:hover {
  color: #ff3b30;
}

/* Дополнительные стили для плавности */
.reply-preview {
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 8px;
  background-color: #f0f4ff;
  border-left: 3px solid #4a6bff;
  border-radius: 4px;
  position: relative;
  transition: all 0.3s ease;
  transform-origin: top;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: #f0f4ff;
  border-radius: 8px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.file-icon {
  width: 24px;
  height: 24px;
}

.file-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
}

.file-size {
  font-size: 12px;
  color: #777;
  margin-left: 8px;
}

.remove-file {
  background: none;
  border: none;
  color: #777;
  font-size: 18px;
  cursor: pointer;
  padding: 0 5px;
}

.remove-file:hover {
  color: #ff3b30;
}

.attach-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 8px;
}

.attach-button img {
  width: 24px;
  height: 24px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.attach-button:hover img {
  opacity: 1;
}

.slide-down-leave-active {
  position: absolute;
}

/* Обновленные стили для чата */
.chat {
  width: 100%;
  height: 100vh;
  max-width: 1440px;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Фиксируем высоту блока сообщений с возможностью прокрутки */
.messages {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  height: calc(100vh - 150px); /* Оставляем место для инпута */
  background-color: #f8f9fc;
  padding: 20px;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  gap: 35px;
  overflow-x: hidden;
  overflow-y: auto;
  flex-grow: 1;
}

/* Фиксируем блок отправки внизу */
.group-send {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 10px 20px;
  border-top: 1px solid #dfe3ec;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

/* Анимации без изменения layout */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  transform-origin: top center;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: scaleY(0.8);
  max-height: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* Плавное появление файлов */
.files-preview {
  max-height: 200px;
  overflow-y: auto;
  transition: max-height 0.3s ease;
}

/* Инпут теперь не прыгает */
.wrap-send {
  transition: padding-top 0.2s ease;
  position: relative;
}

/* Улучшенные стили для превью файлов */
.file-item {
  background: #f8f9fc;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
}

/* Стили для медиафайлов */
.media-container {
  width: 100%;
  margin-bottom: 8px;
  border-radius: 8px;
  overflow: hidden;
}

.media-item {
  margin-bottom: 12px;
  position: relative;
}

.userMedia {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.media-photo {
  max-width: 400px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.media-photo img {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.2s;
}

.media-photo:hover img {
  transform: scale(1.02);
}

.media-caption {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 13px;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}

.media-video {
  max-width: 400px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.media-video video {
  width: 100%;
  display: block;
  background: #000;
}

.video-info {
  padding: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 12px;
}

.duration {
  position: absolute;
  right: 8px;
  bottom: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.media-audio {
  display: flex;
  align-items: center;
  background: #f0f4ff;
  border-radius: 8px;
  padding: 8px;
  max-width: 400px;
}

.media-audio audio {
  flex: 1;
  margin-right: 8px;
}

.audio-info {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  color: #555;
}

.media-voice {
  display: flex;
  align-items: center;
  background: #f0f4ff;
  border-radius: 20px;
  padding: 8px 16px;
  max-width: 300px;
}

.voice-wave {
  display: flex;
  align-items: center;
  margin-right: 12px;
}

.wave {
  width: 3px;
  height: 15px;
  background: #4a6bff;
  margin: 0 2px;
  border-radius: 3px;
  animation: wave 1.5s infinite ease-in-out;
}

.wave:nth-child(1) {
  animation-delay: 0.1s;
  height: 10px;
}

.wave:nth-child(2) {
  animation-delay: 0.3s;
  height: 15px;
}

.wave:nth-child(3) {
  animation-delay: 0.2s;
  height: 12px;
}

@keyframes wave {
  0%,
  100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(0.5);
  }
}

.media-document {
  display: flex;
  align-items: center;
  background: #f0f4ff;
  border-radius: 8px;
  padding: 12px;
  max-width: 400px;
}

.document-icon {
  margin-right: 12px;
}

.document-icon img {
  width: 40px;
  height: 40px;
}

.document-info {
  flex: 1;
}

.filename {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 12px;
  color: #777;
}

.download-btn {
  margin-left: 12px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.download-btn:hover {
  opacity: 1;
}

.download-btn img {
  width: 20px;
  height: 20px;
}

/* Адаптивные стили */
@media (max-width: 768px) {
  .media-photo,
  .media-video {
    max-width: 100%;
  }

  .media-audio,
  .media-document {
    max-width: 100%;
  }

  .media-voice {
    max-width: 80%;
  }
}
/* Добавляем стили для полноэкранного просмотра */
.fullscreen-image-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}

.fullscreen-image-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.fullscreen-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
}

.fullscreen-caption {
  color: white;
  text-align: center;
  padding: 16px;
  font-size: 1.2rem;
}

.close-button {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  width: 40px;
  height: 40px;
}

/* Улучшаем стили для прокрутки */
.messages {
  scroll-behavior: smooth;
}

/* Плавная анимация для чатов */
.fadeChats-enter-active,
.fadeChats-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fadeChats-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.fadeChats-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* Плавная анимация для чатов */
.fadeChatContainer-enter-active,
.fadeChatContainer-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fadeChatContainer-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.fadeChatContainer-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
