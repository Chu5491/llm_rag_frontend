<script setup lang="ts">
import {ref} from "vue";
import {useRouter} from "vue-router";

import {userApi} from "../services/userApi.js";
import {UserRole} from "../types/user.js";

const router = useRouter();
const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const agreeTerms = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");

const handleRegister = async () => {
    if (password.value !== confirmPassword.value) {
        alert("비밀번호가 일치하지 않습니다.");
        return;
    }

    if (!agreeTerms.value) {
        alert("이용약관에 동의해주세요.");
        return;
    }

    isLoading.value = true;
    errorMessage.value = "";

    try {
        await userApi.register({
            email: email.value,
            password: password.value,
            name: name.value,
            role: UserRole.USER,
        });

        alert("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
        router.push("/login");
    } catch (error: any) {
        console.error("Register failed:", error);
        errorMessage.value = error.message || "회원가입에 실패했습니다.";
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
                    회원가입
                </h1>
                <p class="text-gray-500 text-sm">
                    T-Gen과 함께 테스트 자동화를 시작해보세요.
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
            <form class="space-y-5" @submit.prevent="handleRegister">
                <div class="space-y-1.5">
                    <label class="block text-sm font-medium text-gray-700"
                        >이름</label
                    >
                    <input
                        v-model="name"
                        class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                        placeholder="홍길동"
                        required
                        type="text"
                    />
                </div>
                <div class="space-y-1.5">
                    <label class="block text-sm font-medium text-gray-700"
                        >이메일 주소</label
                    >
                    <input
                        v-model="email"
                        class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                        placeholder="name@company.com"
                        required
                        type="email"
                    />
                </div>
                <div class="space-y-1.5">
                    <label class="block text-sm font-medium text-gray-700"
                        >비밀번호</label
                    >
                    <input
                        v-model="password"
                        class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                        placeholder="8자 이상 입력해주세요"
                        required
                        type="password"
                    />
                </div>
                <div class="space-y-1.5">
                    <label class="block text-sm font-medium text-gray-700"
                        >비밀번호 확인</label
                    >
                    <input
                        v-model="confirmPassword"
                        class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                        placeholder="비밀번호를 한번 더 입력해주세요"
                        required
                        type="password"
                    />
                </div>

                <div class="flex items-center">
                    <input
                        id="terms"
                        v-model="agreeTerms"
                        class="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600/20 cursor-pointer"
                        type="checkbox"
                        required
                    />
                    <label
                        class="ml-2 text-sm text-gray-600 cursor-pointer select-none"
                        for="terms"
                    >
                        <a
                            href="#"
                            class="text-indigo-600 hover:text-indigo-800"
                            >이용약관</a
                        >
                        및
                        <a
                            href="#"
                            class="text-indigo-600 hover:text-indigo-800"
                            >개인정보처리방침</a
                        >에 동의합니다.
                    </label>
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
                    가입하기
                </button>
            </form>

            <div class="relative my-8">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-gray-100"></div>
                </div>
            </div>

            <p class="text-center text-sm text-gray-500">
                이미 계정이 있으신가요?
                <a
                    class="text-indigo-600 font-semibold hover:text-indigo-800 ml-1 cursor-pointer"
                    @click="router.push('/login')"
                    >로그인</a
                >
            </p>
        </div>
    </div>
</template>
