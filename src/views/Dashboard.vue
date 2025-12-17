<script setup lang="ts">
</script>

<template>
    <!-- 대시보드 메인 래퍼 -->
    <main class="p-6 space-y-6">
        <!-- 페이지 헤더 -->
        <header>
            <p class="mt-1 text-sm text-gray-500">
                어플리케이션의 전반적인 상태를 확인할 수 있습니다.
                <br />
                현재는 구상중입니다.
            </p>
        </header>

        <!-- 메인 카드 -->
        <section class="rounded-lg bg-white p-6 shadow space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="text-lg font-medium text-blue-800">
                        총 문서 수
                    </h3>
                    <p class="text-2xl font-bold text-blue-600">0</p>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <h3 class="text-lg font-medium text-green-800">
                        총 테스트케이스
                    </h3>
                    <p class="text-2xl font-bold text-green-600">0</p>
                </div>
                <div class="bg-yellow-50 p-4 rounded-lg">
                    <h3 class="text-lg font-medium text-yellow-800">
                        활성화된 모델
                    </h3>
                    <p class="text-2xl font-bold text-yellow-600">0</p>
                </div>
            </div>
        </section>
    </main>
</template>
