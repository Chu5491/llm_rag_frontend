<template>
    <!-- 대시보드 메인 래퍼 -->
    <main class="p-6 space-y-6">
        <!-- 페이지 헤더 (기존과 동일) -->
        <header class="flex items-center justify-between">
            <div>
                <p class="mt-1 text-sm text-gray-500">
                    생성된 프로젝트의 목록을 조회합니다.
                </p>
            </div>
            <RouterLink
                to="/project/new"
                class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                <span>프로젝트 등록</span>
            </RouterLink>
        </header>

        <!-- 메인 카드 -->
        <section class="rounded-lg bg-white p-6 shadow space-y-6">
            <div class="overflow-x-auto rounded-lg border border-gray-100 bg-white">
                <table class="table-container">
                    <thead class="table-header">
                        <tr>
                            <th class="w-10 table-header-cell"></th>
                            <th class="w-32 table-header-cell">프로젝트명</th>
                            <th class="table-header-cell">설명</th>
                            <th class="w-32 table-header-cell">
                                생성 TC 건 수
                            </th>
                            <th class="table-header-cell"></th>
                        </tr>
                    </thead>
                    <tbody class="table-body">
                        <!-- 행 1 -->
                        <tr
                            class="table-row cursor-pointer"
                            @click="$router.push('/project/detail/1')"
                        >
                            <td class="table-cell text-center">1</td>
                            <td class="table-cell">
                                <code class="text-xs font-mono text-indigo-600">
                                    SK Agent Bench
                                </code>
                            </td>
                            <td class="table-cell text-gray-700">
                                로그인 성공 시 대시보드 진입 확인
                            </td>
                            <td class="table-cell">
                                <span class="badge badge-red">
                                    582
                                </span>
                            </td>
                            <td class="table-cell">X</td>
                        </tr>

                        <!-- 행 2 -->
                        <tr
                            class="table-row cursor-pointer"
                            @click="$router.push('/project/detail/2')"
                        >
                            <td class="table-cell text-center">2</td>
                            <td class="table-cell">
                                <code class="text-xs font-mono text-indigo-600">
                                    Samsung VOC
                                </code>
                            </td>
                            <td class="table-cell text-gray-700">
                                잘못된 비밀번호 입력 시 오류 메시지 표시
                            </td>
                            <td class="table-cell">
                                <span class="badge badge-yellow">
                                    250
                                </span>
                            </td>
                            <td class="table-cell">X</td>
                        </tr>

                        <!-- 행 3 -->
                        <tr
                            class="table-row cursor-pointer"
                            @click="$router.push('/project/detail/3')"
                        >
                            <td class="table-cell text-center">3</td>
                            <td class="table-cell">
                                <code class="text-xs font-mono text-indigo-600">
                                    T-Gen
                                </code>
                            </td>
                            <td class="table-cell text-gray-700">
                                로그인 페이지에서 비밀번호 보기 토글 동작 확인
                            </td>
                            <td class="table-cell">
                                <span class="badge badge-green">
                                    120
                                </span>
                            </td>
                            <td class="table-cell">X</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import {useRouter} from "vue-router";

const router = useRouter();

// 필요시 라우터를 사용한 프로그래밍 방식의 네비게이션을 위해
const navigateToProject = (id: number) => {
    router.push(`/project/detail/${id}`);
};
</script>
