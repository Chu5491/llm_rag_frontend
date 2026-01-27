<script setup lang="ts">
import {ref} from "vue";
import {useRouter} from "vue-router";
import {useAuthStore} from "../stores/auth.js";

import {userApi} from "../services/userApi.js";

const router = useRouter();
const authStore = useAuthStore();
const email = ref("");
const password = ref("");
const rememberMe = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");

const handleLogin = async () => {
    isLoading.value = true;
    errorMessage.value = "";

    try {
        const response = await userApi.login({
            email: email.value,
            password: password.value,
        });

        // 토큰 저장 (실제 구현 시 보안 고려 필요: cookie, memory etc)
        localStorage.setItem("accessToken", response.access_token);

        // 유저 정보 가져오기
        await authStore.fetchUser();

        // 페이지 이동
        router.push("/");
    } catch (error: any) {
        console.error("Login failed:", error);
        errorMessage.value = error.message || "로그인에 실패했습니다.";
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <div
        class="bg-gray-50 text-gray-900 min-h-screen flex flex-col items-center justify-center p-6 font-sans"
    >
        <div class="mb-8 flex items-center gap-2">
            <div
                class="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-sm"
            >
                T
            </div>
            <span class="text-xl font-bold tracking-tight text-gray-800"
                >T-Gen</span
            >
        </div>
        <div
            class="w-full max-w-[440px] bg-white border border-gray-200 rounded-xl p-8 shadow-lg"
        >
            <div class="mb-8">
                <h1 class="text-2xl font-semibold text-gray-900 mb-1">
                    로그인
                </h1>
                <p class="text-gray-500 text-sm">
                    반갑습니다! 계정 정보를 입력해주세요.
                </p>
                <div
                    v-if="errorMessage"
                    class="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2"
                >
                    <span class="material-symbols-outlined text-base"
                        >error</span
                    >
                    {{ errorMessage }}
                </div>
            </div>
            <form class="space-y-5" @submit.prevent="handleLogin">
                <div class="space-y-1.5">
                    <label class="block text-sm font-medium text-gray-700"
                        >이메일 주소</label
                    >
                    <!-- TODO: 테스트용 value -->
                    <input
                        v-model="email"
                        class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                        placeholder="name@company.com"
                        required
                        type="email"
                    />
                    chu5491@gmail.com<br />
                    admin@admin.com
                </div>
                <div class="space-y-1.5">
                    <div class="flex justify-between items-center">
                        <label class="block text-sm font-medium text-gray-700"
                            >비밀번호</label
                        >
                        <a
                            class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                            href="#"
                            >비밀번호를 잊으셨나요?</a
                        >
                    </div>
                    <!-- TODO: 테스트용 value -->
                    <input
                        v-model="password"
                        class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                        placeholder="••••••••"
                        required
                        type="password"
                    />
                    a0215487<br />
                    admin
                </div>
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <input
                            id="remember"
                            v-model="rememberMe"
                            class="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600/20 cursor-pointer"
                            type="checkbox"
                        />
                        <label
                            class="ml-2 text-sm text-gray-600 cursor-pointer select-none"
                            for="remember"
                            >로그인 유지</label
                        >
                    </div>
                </div>
                <button
                    class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    type="submit"
                    :disabled="isLoading"
                >
                    <span
                        v-if="isLoading"
                        class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"
                    ></span>
                    로그인
                </button>
            </form>

            <p class="mt-8 text-center text-sm text-gray-500">
                T-Gen이 처음이신가요?
                <a
                    class="text-indigo-600 font-semibold hover:text-indigo-800 ml-1 cursor-pointer"
                    @click="router.push('/register')"
                    >회원가입</a
                >
            </p>
        </div>
    </div>
</template>
