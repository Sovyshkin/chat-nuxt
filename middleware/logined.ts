import { useAuthStore } from '@/stores/auth';
export default defineNuxtRouteMiddleware(async (to, from) => {
    const authStore = useAuthStore();
    if(authStore.isAuthenticated){
        return navigateTo("/chat")
    }
  })