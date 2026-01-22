import {computed} from "vue";
import {useAuthStore} from "../stores/auth.js";

export function useAuthHelper() {
    const authStore = useAuthStore();

    // 현재 사용자 객체
    const user = computed(() => authStore.user);

    // 현재 사용자 ID
    const currentUserId = computed(() => authStore.user?.id);

    // 로그인 여부
    const isAuthenticated = computed(() => !!authStore.user);

    // 본인 소유 여부 확인
    const isMine = (targetUserId: number | null | undefined) => {
        if (!targetUserId || !currentUserId.value) return false;
        return targetUserId === currentUserId.value;
    };

    return {
        user,
        currentUserId,
        isAuthenticated,
        isMine,
    };
}
