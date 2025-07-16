<script setup>
import { ref } from "vue";
import AppNotification from "@/components/AppNotification.vue";
import Modal from "@/components/Modal.vue";
import { useChatStore } from "@/stores/chat";

const selectedElements = document.querySelectorAll('.selected');
console.log(selectedElements);

selectedElements.forEach(element => {
  element.classList.remove('selected');
});

const chatStore = useChatStore();
chatStore.connect()


const showCreateGroupModal = ref(false);
const newGroupName = ref("");
const selectedUsers = ref([]);

const toggleUserSelection = (userId) => {
  const index = selectedUsers.value.indexOf(userId);
  if (index === -1) {
    selectedUsers.value.push(userId);
  } else {
    selectedUsers.value.splice(index, 1);
  }
};

const createGroup = async () => {
  if (newGroupName.value.trim() && selectedUsers.value.length > 0) {
    chatStore.createGroup({
      title: newGroupName.value,
      members: selectedUsers.value,
    });
    newGroupName.value = "";
    selectedUsers.value = [];
    showCreateGroupModal.value = false;
  }
};

const goCreateGroup = async () => {
  try {
    showCreateGroupModal.value = true;
    await chatStore.goCreateGroup();
  } catch (err) {
    console.log(err);
  }
};
</script>

<template>
  <div class="wrapper">
    <header class="header-chats">
      <div class="emp"></div>
      <h1>Chats</h1>
      <img
        class="img-create-group"
        src="../assets/create-group.png"
        alt=""
        @click="goCreateGroup()"
      />
    </header>

    <ul class="chats">
      <li
        class="chat"
        @click="chatStore.openChat(item)"
        v-for="item in chatStore.clients"
        :key="item._id"
        :class="{ selected: chatStore.selectedChat._id === item._id }"
      >
        <div class="info">
          <img :src="item.avatar" alt="" />
          <span class="name">{{ item.name }}</span>
        </div>
        <div
          class="online"
          v-if="item.online && !item.notification && item.type == 'private'"
        ></div>
        <div
          class="offline"
          v-if="!item.online && !item.notification && item.type == 'private'"
        ></div>
        <AppNotification v-if="item.notification" />
      </li>
    </ul>

    <!-- Модальное окно создания группы -->
    <Modal v-if="showCreateGroupModal" @close="showCreateGroupModal = false">
      <div class="create-group-modal">
        <h2>A new group</h2>

        <div class="form-group">
          <input
            type="text"
            v-model="newGroupName"
            placeholder="Group name"
            class="group-name-input"
          />
        </div>
        <AppLoader v-if="chatStore.isLoading" />
        <div class="users-list" v-else>
          <h3>Select the participants:</h3>
          <div
            class="user-item"
            v-for="user in chatStore.users"
            :key="user._id"
            @click="toggleUserSelection(user._id)"
          >
            <img src="../assets/gpt.svg" alt="" class="user-avatar" />
            <span class="user-name">{{ user.name }}</span>
            <div
              class="checkbox"
              :class="{ checked: selectedUsers.includes(user._id) }"
            ></div>
          </div>
        </div>

        <button
          class="create-btn"
          @click="createGroup"
          :disabled="!newGroupName.trim() || selectedUsers.length === 0"
        >
        Create a group
        </button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.wrapper {
  width: 100%;
  max-width: 500px;
  height: 100vh;
  background-color: #f8f9fc;
  border-right: 1px solid black;
  overflow-x: hidden;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
}

.wrapper {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.header-chats {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px;
  border-bottom: 1px solid black;
}

h1 {
  font-size: large;
  font-weight: bold;
}

.img-create-group {
  height: 45px;
  cursor: pointer;
  transition: all 500ms ease;
}

.img-create-group:hover {
  transform: translateY(-3px);
}

.chats {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.chat {
  width: 100%;
  padding: 20px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid black;
  cursor: pointer;
  transition: all 500ms ease;
}

.selected {
  background-color: #e6eefe;
}

.info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.online {
  width: 6px;
  height: 6px;
  border-radius: 100%;
  background-color: rgb(76, 211, 76);
}

.offline {
  width: 6px;
  height: 6px;
  border-radius: 100%;
  background-color: rgb(219, 60, 32);
}

.chat:hover {
  transform: scale(1.02);
}

/* Стили для модального окна */
.create-group-modal {
  padding: 20px;
  width: 100%;
  max-width: 400px;
  min-width: 350px;
  background: white;
  border-radius: 12px;
}

.create-group-modal h2 {
  margin-bottom: 20px;
  text-align: center;
}

.group-name-input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 16px;
}

.users-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.users-list h3 {
  margin-bottom: 10px;
  font-size: 14px;
  color: #555;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-item:hover {
  background: #f5f5f5;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
  object-fit: cover;
}

.user-name {
  flex-grow: 1;
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 50%;
  transition: all 0.2s;
}

.checkbox.checked {
  background: #4a6bff;
  border-color: #4a6bff;
  position: relative;
}

.checkbox.checked::after {
  content: "";
  position: absolute;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.create-btn {
  width: 100%;
  padding: 12px;
  background: #4a6bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.create-btn:hover {
  background: #3a5bef;
}

.create-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
