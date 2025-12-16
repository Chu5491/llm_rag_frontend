<script setup lang="ts">
import Sidebar from "@/components/Sidebar.vue";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import Chatbot from "@/components/Chatbot.vue";
</script>

<template>
    <div class="min-h-screen bg-gray-50 font-sans text-gray-900">
        <!-- 사이드바: 왼쪽 고정 -->
        <Sidebar />

        <!-- 메인 영역 래퍼 -->
        <div
            class="ml-64 flex flex-col min-h-screen transition-all duration-300 ease-in-out"
        >
            <!-- 헤더: 상단 고정 (메인 영역 내부 상단) -->
            <Header />

            <!-- 콘텐츠 영역 -->
            <main class="flex-1 pt-16 p-6">
                <div class="max-w-7xl mx-auto h-full">
                    <slot />
                </div>
            </main>

            <!-- 푸터 -->
            <Footer />
        </div>

        <!-- 챗봇 (Floating) -->
        <Chatbot />
    </div>
</template>
