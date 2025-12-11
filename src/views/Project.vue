<script setup lang="ts">
import {RouterLink} from "vue-router";
// import { ref, computed } from "vue";
// import { generateTestCases } from "../services/api.js";
// 지금은 정적 목업이니까 위 둘은 일단 주석/삭제해도 됨
</script>

<template>
    <!-- 대시보드 메인 래퍼 -->
    <main class="p-6 space-y-6">
        <!-- 페이지 헤더 -->
        <header class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-semibold text-gray-900">
                    Project 목록
                </h1>
                <p class="mt-1 text-sm text-gray-500">
                    생성된 프로젝트의 목록을 조회합니다.
                </p>
            </div>

            <!-- 프로젝트 등록 버튼 -->
            <RouterLink
                to="/project/new"
                class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                <span class="mr-1"></span>
                <span>프로젝트 등록</span>
            </RouterLink>
        </header>

        <!-- 메인 카드 -->
        <section class="rounded-lg bg-white p-6 shadow space-y-6">
            <div
                class="overflow-x-auto rounded-lg border border-gray-100 bg-white"
            >
                <table class="min-w-full text-sm">
                    <thead class="bg-gray-50 text-xs font-medium text-gray-500">
                        <tr>
                            <th class="w-10 px-3 py-2 text-left"></th>
                            <th class="w-32 px-3 py-2 text-left">프로젝트명</th>
                            <th class="px-3 py-2 text-left">설명</th>
                            <th class="w-32 px-3 py-2 text-left">
                                생성 TC 건 수
                            </th>
                            <th class="px-3 py-2 text-left"></th>
                        </tr>
                    </thead>

                    <tbody class="divide-y divide-gray-100">
                        <!-- 행 1 -->
                        <tr class="bg-gray-50">
                            <td class="px-3 py-2 text-center align-top">1</td>
                            <td class="px-3 py-2 align-top">
                                <code class="text-xs font-mono text-indigo-600">
                                    SK Agent Bench
                                </code>
                            </td>
                            <td class="px-3 py-2 align-top">
                                로그인 성공 시 대시보드 진입 확인
                            </td>
                            <td class="px-3 py-2 align-top">
                                <span
                                    class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                                >
                                    582
                                </span>
                            </td>
                            <td class="px-3 py-2 align-top">X</td>
                        </tr>

                        <!-- 행 2 -->
                        <tr class="hover:bg-gray-50">
                            <td class="px-3 py-2 text-center align-top">2</td>
                            <td class="px-3 py-2 align-top">
                                <code class="text-xs font-mono text-indigo-600">
                                    Samsung VOC
                                </code>
                            </td>
                            <td class="px-3 py-2 align-top">
                                잘못된 비밀번호 입력 시 오류 메시지 표시
                            </td>
                            <td class="px-3 py-2 align-top">
                                <span
                                    class="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700"
                                >
                                    250
                                </span>
                            </td>
                            <td class="px-3 py-2 align-top">X</td>
                        </tr>

                        <!-- 행 3 -->
                        <tr class="hover:bg-gray-50">
                            <td class="px-3 py-2 text-center align-top">3</td>
                            <td class="px-3 py-2 align-top">
                                <code class="text-xs font-mono text-indigo-600">
                                    T-Gen
                                </code>
                            </td>
                            <td class="px-3 py-2 align-top">
                                로그인 페이지에서 비밀번호 보기 토글 동작 확인
                            </td>
                            <td class="px-3 py-2 align-top">
                                <span
                                    class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                                >
                                    48
                                </span>
                            </td>
                            <td class="px-3 py-2 align-top">X</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </main>
</template>
