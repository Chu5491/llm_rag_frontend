import {defineStore} from "pinia";
import {ref, computed} from "vue";
import {User} from "../types/user.js";
import {userApi} from "../services/userApi.js";
import router from "../router/index.js";

export const useAuthStore = defineStore("auth", () => {
    // State
    const user = ref<User | null>(null);
    const isLoading = ref(false);

    // Getters
    const isAuthenticated = computed(() => !!user.value);

    // 사용자 정보 가져오기
    const fetchUser = async () => {
        isLoading.value = true;
        try {
            const userData = await userApi.me();
            user.value = userData;
        } catch (error) {
            console.error("실패: 사용자 정보 가져오기", error);
            user.value = null;
        } finally {
            isLoading.value = false;
        }
    };

    // 로그아웃
    const logout = () => {
        user.value = null;
        localStorage.removeItem("accessToken");
        router.push("/login");
    };

    // 초기화 (앱 시작 시 토큰 있으면 로드)
    const initialize = async () => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            await fetchUser();
        }
    };

    return {
        user,
        isLoading,
        isAuthenticated,
        fetchUser,
        logout,
        initialize,
    };
});
