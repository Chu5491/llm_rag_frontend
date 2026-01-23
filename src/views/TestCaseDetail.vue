```
<script setup lang="ts">
import {ref, onMounted, computed} from "vue";
import {useRoute, useRouter} from "vue-router";
import draggable from "vuedraggable";
import {useAlert} from "../composables/useAlert.js";
import {useAuthHelper} from "../composables/useAuthHelper.js";
import {formatDateTime} from "../utils/date.js";
import {
    getTestCaseDetail,
    updateTestCase,
    deleteTestCase,
    createTestCaseComment,
    deleteTestCaseComment,
    type TestcaseUpdate,
    type TestCaseCommentResponse,
    type TestCaseEditHistoryResponse,
    type TestcaseStep,
} from "../services/testcaseApi.js";

// --- Types ---
interface TestCaseForm {
    id: number;
    testcase_id_tag: string;
    module: string;
    title: string;
    priority: string;
    scenario: TestcaseStep[];
    precondition: string;
    expectedResult: string;
    status: string;
}

const route = useRoute();
const router = useRouter();
const {showAlert, showConfirm} = useAlert();
const {isMine, currentUserId, user, isAuthenticated} = useAuthHelper();

// --- State ---
const isLoading = ref(false);
const error = ref<string | null>(null);

const formData = ref<TestCaseForm>({
    id: 0,
    testcase_id_tag: "",
    module: "",
    title: "",
    priority: "Low",
    scenario: [{action: "", expected: ""}],
    precondition: "",
    expectedResult: "",
    status: "inactive",
});

// --- State: Real Data ---
const activeTab = ref("history");
const newComment = ref("");

const versionHistory = ref<TestCaseEditHistoryResponse[]>([]);
const comments = ref<TestCaseCommentResponse[]>([]);
const newReply = ref("");
const replyingTo = ref<number | null>(null);

// 댓글 트리 구조 생성 (부모-자식 관계)
const commentTree = computed(() => {
    const map = new Map<number, TestCaseCommentResponse & {replies: any[]}>();
    const roots: (TestCaseCommentResponse & {replies: any[]})[] = [];

    // 1. 모든 댓글을 Map에 등록 (replies 배열 초기화)
    comments.value.forEach((c) => {
        map.set(c.id, {...c, replies: []});
    });

    // 2. 부모-자식 연결
    comments.value.forEach((c) => {
        const node = map.get(c.id);
        if (c.parent_id) {
            const parent = map.get(c.parent_id);
            if (parent) {
                parent.replies.push(node);
            } else {
                // 부모가 없으면(삭제됨 등) 루트로 처리하거나 제외 (여기선 루트로)
                roots.push(node!);
            }
        } else {
            roots.push(node!);
        }
    });

    // 3. 최신순 정렬 (루트 및 대댓글)
    roots.sort(
        (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    map.forEach((node) => {
        node.replies.sort(
            (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
        );
    });

    return roots;
});

// --- Actions : Comment ---
const addComment = async () => {
    if (!newComment.value.trim() || !formData.value.id || !currentUserId.value)
        return;

    try {
        const response = await createTestCaseComment(
            formData.value.id,
            currentUserId.value,
            newComment.value
        );
        // 목록 최상단에 추가
        comments.value.unshift(response);
        newComment.value = "";
    } catch (e) {
        console.error("Failed to add comment:", e);
        showAlert("댓글 등록에 실패했습니다.", "오류");
    }
};

const handleDeleteComment = async (commentId: number) => {
    const confirmed = await showConfirm("댓글을 삭제하시겠습니까?", "삭제");
    if (!confirmed) return;

    try {
        await deleteTestCaseComment(commentId);
        comments.value = comments.value.filter((c) => c.id !== commentId);
    } catch (e) {
        console.error("Failed to delete comment:", e);
        showAlert("댓글 삭제에 실패했습니다.", "오류");
    }
};

const toggleReply = (commentId: number) => {
    if (replyingTo.value === commentId) {
        replyingTo.value = null;
        newReply.value = "";
    } else {
        replyingTo.value = commentId;
        newReply.value = "";
    }
};

const addReply = async (parentId: number) => {
    if (!newReply.value.trim() || !formData.value.id || !currentUserId.value)
        return;

    try {
        const response = await createTestCaseComment(
            formData.value.id,
            currentUserId.value,
            newReply.value,
            parentId
        );
        // 목록에 추가 (트리가 자동으로 재구성됨)
        comments.value.push(response);
        newReply.value = "";
        replyingTo.value = null;
    } catch (e) {
        console.error("Failed to add reply:", e);
        showAlert("답글 등록에 실패했습니다.", "오류");
    }
};

// --- Actions : Main ---

// 데이터 조회
const fetchDetail = async () => {
    const id = Number(route.params.id);
    if (!id) return;

    isLoading.value = true;
    error.value = null;

    try {
        const data = await getTestCaseDetail(id);
        formData.value = {
            id: data.id,
            testcase_id_tag: data.testcase_id_tag || `TC-${data.id}`,
            module: data.module,
            title: data.title,
            priority: data.priority || "Low",
            scenario:
                data.steps && data.steps.length > 0
                    ? data.steps.map((s) => ({
                          action: s.action,
                          expected: s.expected,
                      }))
                    : [{action: "", expected: ""}],
            precondition: data.preconditions || "",
            expectedResult: data.expected_result,
            status: data.status,
        };

        // 추가 데이터 연동 (Array 보장)
        comments.value = data.comments || [];
        versionHistory.value = data.edit_history || [];
    } catch (err) {
        console.error("Failed to fetch test case:", err);
        error.value = "데이터를 불러오는 중 오류가 발생했습니다.";
    } finally {
        isLoading.value = false;
    }
};

// 시나리오 단계 추가
const addScenarioStep = () => {
    formData.value.scenario.push({action: "", expected: ""});
};

// 시나리오 단계 제거
const removeScenarioStep = (index: number) => {
    if (formData.value.scenario.length > 1) {
        formData.value.scenario.splice(index, 1);
    }
};

// 폼 제출 (수정)
const handleSubmit = async () => {
    if (!isAuthenticated.value) {
        await showAlert("로그인 후 이용 가능합니다.", "알림");
        return;
    }
    if (!formData.value.id) return;

    const confirmed = await showConfirm("변경사항을 저장하시겠습니까?", "확인");
    if (!confirmed) return;

    try {
        const updateData: TestcaseUpdate = {
            module: formData.value.module,
            title: formData.value.title,
            priority: formData.value.priority,
            preconditions: formData.value.precondition,
            expected_result: formData.value.expectedResult,
            steps: formData.value.scenario.map((s) => ({
                action: s.action,
                expected: s.expected,
            })),
            status: formData.value.status,
            user_id: currentUserId.value || null,
        };

        const response = await updateTestCase(formData.value.id, updateData);
        if (response) {
            showAlert("저장되었습니다.", "성공");
        }
    } catch (error) {
        console.error("Failed to update test case:", error);
        showAlert("저장 중 오류가 발생했습니다.", "오류");
    }
};

// 테스트케이스 삭제
const handleDelete = async () => {
    if (!isAuthenticated.value) {
        await showAlert("로그인 후 이용 가능합니다.", "알림");
        return;
    }
    if (!formData.value.id) return;

    const confirmed = await showConfirm(
        "정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
        "삭제 확인"
    );
    if (!confirmed) return;

    try {
        await deleteTestCase(formData.value.id);
        showAlert("삭제되었습니다.", "성공").then(() => {
            router.back();
        });
    } catch (error) {
        console.error("Failed to delete test case:", error);
        showAlert("삭제 중 오류가 발생했습니다.", "오류");
    }
};

onMounted(() => {
    fetchDetail();
});
</script>

<template>
    <main class="p-6 space-y-6">
        <!-- 로딩/에러 처리 -->
        <div v-if="isLoading" class="flex justify-center py-20">
            <div
                class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"
            ></div>
        </div>
        <div v-else-if="error" class="text-center py-20 text-red-500">
            {{ error }}
        </div>

        <template v-else>
            <!-- 페이지 헤더 -->
            <header>
                <p class="mt-1 text-sm text-gray-500">
                    테스트케이스 상세 정보를 조회 및 수정합니다.
                </p>
            </header>

            <!-- 메인 카드 -->
            <section class="rounded-lg bg-white p-6 shadow">
                <form class="space-y-8" @submit.prevent="handleSubmit">
                    <!-- 1. Row: TC ID -->
                    <div class="space-y-2">
                        <label class="block text-sm font-bold text-gray-700">
                            TC ID
                        </label>
                        <div class="max-w-xs">
                            <input
                                v-model="formData.testcase_id_tag"
                                type="text"
                                readonly
                                class="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed text-center font-mono"
                            />
                        </div>
                    </div>

                    <!-- 2. Row: Title -->
                    <div class="space-y-2">
                        <label class="block text-sm font-bold text-gray-700">
                            타이틀
                        </label>
                        <div class="max-w-lg">
                            <input
                                v-model="formData.title"
                                type="text"
                                class="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                placeholder="타이틀을 입력하세요"
                            />
                        </div>
                    </div>

                    <!-- 3. Row: Module & Priority -->
                    <div class="flex flex-wrap items-end gap-10">
                        <!-- Module -->
                        <div class="space-y-2 flex-1 md:flex-none md:w-1/3">
                            <label
                                class="block text-sm font-bold text-gray-700"
                            >
                                기능
                            </label>
                            <div>
                                <input
                                    v-model="formData.module"
                                    type="text"
                                    readonly
                                    class="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                                    placeholder="기능 명"
                                />
                            </div>
                        </div>

                        <!-- Priority -->
                        <div class="space-y-2 pb-1">
                            <label
                                class="block text-sm font-bold text-gray-700 mb-2"
                            >
                                중요도
                            </label>
                            <div class="flex items-center gap-6">
                                <!-- High -->
                                <label
                                    class="flex flex-col items-center gap-1 cursor-pointer group"
                                >
                                    <input
                                        v-model="formData.priority"
                                        type="radio"
                                        value="High"
                                        class="peer hidden"
                                    />
                                    <span
                                        class="material-symbols-outlined text-3xl rotate-90 text-gray-400 peer-checked:text-blue-600 group-hover:text-gray-600 transition-colors"
                                    >
                                        battery_full
                                    </span>
                                    <span
                                        class="text-xs font-bold text-gray-400 peer-checked:text-blue-600 group-hover:text-gray-600 transition-colors"
                                    >
                                        HIGH
                                    </span>
                                </label>

                                <!-- Medium -->
                                <label
                                    class="flex flex-col items-center gap-1 cursor-pointer group"
                                >
                                    <input
                                        v-model="formData.priority"
                                        type="radio"
                                        value="Medium"
                                        class="peer hidden"
                                    />
                                    <span
                                        class="material-symbols-outlined text-3xl rotate-90 text-gray-400 peer-checked:text-blue-600 group-hover:text-gray-600 transition-colors"
                                    >
                                        battery_horiz_050
                                    </span>
                                    <span
                                        class="text-xs font-bold text-gray-400 peer-checked:text-blue-600 group-hover:text-gray-600 transition-colors"
                                    >
                                        Medium
                                    </span>
                                </label>

                                <!-- Low -->
                                <label
                                    class="flex flex-col items-center gap-1 cursor-pointer group"
                                >
                                    <input
                                        v-model="formData.priority"
                                        type="radio"
                                        value="Low"
                                        class="peer hidden"
                                    />
                                    <span
                                        class="material-symbols-outlined text-3xl rotate-90 text-gray-400 peer-checked:text-blue-600 group-hover:text-gray-600 transition-colors"
                                    >
                                        battery_horiz_075
                                    </span>
                                    <span
                                        class="text-xs font-bold text-gray-400 peer-checked:text-blue-600 group-hover:text-gray-600 transition-colors"
                                    >
                                        Low
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- 3. Row: Preconditions -->
                    <div class="space-y-2">
                        <label class="block text-sm font-bold text-gray-700">
                            선행조건
                        </label>
                        <div
                            class="w-full border border-gray-300 rounded-lg p-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
                        >
                            <textarea
                                v-model="formData.precondition"
                                class="w-full h-24 bg-transparent border-none focus:ring-0 resize-none text-sm text-gray-700"
                                placeholder="테스트 수행 전 만족해야 할 선행조건을 입력하세요"
                            ></textarea>
                        </div>
                    </div>

                    <!-- 4. Row: Scenario -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <label class="text-lg font-bold text-gray-800">
                                시나리오
                            </label>
                            <button
                                type="button"
                                @click="addScenarioStep"
                                class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                            >
                                <span class="material-icons-outlined text-xl"
                                    >add</span
                                >
                            </button>
                        </div>

                        <div
                            class="border-t border-b border-gray-200 divide-y divide-gray-100"
                        >
                            <!-- @vue-ignore -->
                            <draggable
                                v-model="formData.scenario"
                                item-key="text"
                                handle=".handle"
                                ghost-class="bg-blue-50"
                            >
                                <template #item="{element, index}">
                                    <div
                                        class="flex items-center gap-3 py-3 group"
                                    >
                                        <!-- Drag Handle -->
                                        <div
                                            class="handle cursor-move text-gray-300 group-hover:text-gray-500 transition-colors"
                                        >
                                            <span
                                                class="material-icons-outlined"
                                                >drag_indicator</span
                                            >
                                        </div>
                                        <!-- Index -->
                                        <span
                                            class="text-sm font-semibold text-gray-500 w-6"
                                        >
                                            {{ index + 1 }}.
                                        </span>
                                        <!-- Action Input -->
                                        <div class="flex-1 flex flex-col gap-1">
                                            <label
                                                class="text-xs font-semibold text-gray-500"
                                                >Action</label
                                            >
                                            <textarea
                                                v-model="element.action"
                                                rows="2"
                                                class="w-full bg-white border border-gray-200 rounded p-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors resize-none placeholder-gray-300"
                                                placeholder="행동을 입력하세요..."
                                            ></textarea>
                                        </div>
                                        <!-- Expected Input -->
                                        <div class="flex-1 flex flex-col gap-1">
                                            <label
                                                class="text-xs font-semibold text-gray-500"
                                                >Expected</label
                                            >
                                            <textarea
                                                v-model="element.expected"
                                                rows="2"
                                                class="w-full bg-white border border-gray-200 rounded p-2 text-sm focus:ring-2 focus:ring-green-100 focus:border-green-300 transition-colors resize-none placeholder-gray-300"
                                                placeholder="기대결과를 입력하세요..."
                                            ></textarea>
                                        </div>
                                        <!-- Remove Button -->
                                        <button
                                            type="button"
                                            @click="removeScenarioStep(index)"
                                            class="text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <span
                                                class="material-icons-outlined"
                                                >remove_circle_outline</span
                                            >
                                        </button>
                                    </div>
                                </template>
                            </draggable>
                        </div>
                    </div>

                    <!-- 5. Row: Expected Result -->
                    <div class="space-y-2">
                        <label class="block text-sm font-bold text-gray-700">
                            최종 기대결과
                        </label>
                        <div
                            class="w-full border border-gray-300 rounded-lg p-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
                        >
                            <textarea
                                v-model="formData.expectedResult"
                                class="w-full h-24 bg-transparent border-none focus:ring-0 resize-none text-sm text-gray-700"
                                placeholder="전체 시나리오 수행 후의 최종 기대결과를 입력하세요"
                            ></textarea>
                        </div>
                    </div>

                    <!-- 상태 (Status) -->
                    <div class="pt-6 border-t border-gray-200">
                        <div class="flex items-start gap-12">
                            <label class="text-lg font-bold text-gray-800 mt-1">
                                상태 (Status)
                            </label>
                            <div class="flex flex-col gap-4">
                                <div class="flex gap-6">
                                    <!-- Active -->
                                    <label
                                        class="flex items-center gap-2 cursor-pointer"
                                    >
                                        <input
                                            v-model="formData.status"
                                            type="radio"
                                            value="active"
                                            class="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300"
                                        />
                                        <span
                                            class="text-gray-700 font-medium badge bg-green-50 px-2 py-0.5 rounded-full text-xs"
                                        >
                                            Active
                                        </span>
                                    </label>
                                    <!-- Inactive -->
                                    <label
                                        class="flex items-center gap-2 cursor-pointer"
                                    >
                                        <input
                                            v-model="formData.status"
                                            type="radio"
                                            value="inactive"
                                            class="w-4 h-4 text-gray-600 focus:ring-gray-500 border-gray-300"
                                        />
                                        <span
                                            class="text-gray-700 font-medium badge bg-gray-100 px-2 py-0.5 rounded-full text-xs"
                                        >
                                            Inactive
                                        </span>
                                    </label>
                                    <!-- Generated -->
                                    <label
                                        class="flex items-center gap-2 cursor-pointer"
                                    >
                                        <input
                                            v-model="formData.status"
                                            type="radio"
                                            value="generated"
                                            class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <span
                                            class="text-gray-700 font-medium badge bg-blue-50 px-2 py-0.5 rounded-full text-xs"
                                        >
                                            Generated
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 버튼 영역 -->
                    <div class="flex items-center justify-between pt-6">
                        <!-- 좌측: 삭제 버튼 -->
                        <button
                            type="button"
                            @click="handleDelete"
                            class="px-6 py-2.5 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                        >
                            <span class="material-icons-outlined text-[18px]"
                                >delete</span
                            >
                            삭제
                        </button>

                        <!-- 우측: 목록/저장 버튼 -->
                        <div class="flex items-center gap-4">
                            <button
                                type="button"
                                @click="router.go(-1)"
                                class="px-8 py-2.5 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors shadow-sm"
                            >
                                목록으로
                            </button>
                            <button
                                type="submit"
                                class="px-12 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </form>
            </section>

            <!-- 리뷰 & 히스토리 탭 (Mockup Restored) -->
            <section class="rounded-lg bg-white shadow">
                <!-- 탭 헤더 -->
                <div class="border-b border-gray-200 px-6">
                    <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            @click="activeTab = 'history'"
                            :class="[
                                activeTab === 'history'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                'whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors',
                            ]"
                        >
                            변경 이력
                        </button>
                        <button
                            @click="activeTab = 'comments'"
                            :class="[
                                activeTab === 'comments'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                'whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors flex items-center',
                            ]"
                        >
                            리뷰 코멘트
                            <span
                                :class="[
                                    activeTab === 'comments'
                                        ? 'bg-blue-100 text-blue-600'
                                        : 'bg-gray-100 text-gray-900',
                                    'ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium',
                                ]"
                            >
                                {{ comments.length }}
                            </span>
                        </button>
                    </nav>
                </div>

                <!-- 탭 컨텐츠 -->
                <div class="p-6">
                    <!-- 변경 이력 탭 -->
                    <div v-if="activeTab === 'history'" class="space-y-4">
                        <div class="overflow-x-auto">
                            <table
                                class="w-full text-left text-sm text-gray-600"
                            >
                                <thead
                                    class="border-b border-gray-200 bg-gray-50"
                                >
                                    <tr>
                                        <th
                                            class="py-3 px-4 font-medium text-gray-500"
                                        >
                                            버전
                                        </th>
                                        <th
                                            class="py-3 px-4 font-medium text-gray-500"
                                        >
                                            수정일
                                        </th>
                                        <th
                                            class="py-3 px-4 font-medium text-gray-500"
                                        >
                                            수정자
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    <tr
                                        v-for="(
                                            history, index
                                        ) in versionHistory"
                                        :key="history.id"
                                        class="hover:bg-gray-50 transition-colors"
                                    >
                                        <td class="py-3 px-4">
                                            <span
                                                class="text-blue-600 font-bold"
                                            >
                                                v{{
                                                    versionHistory.length -
                                                    index
                                                }}.0
                                            </span>
                                        </td>
                                        <td class="py-3 px-4">
                                            {{
                                                formatDateTime(
                                                    history.updated_at
                                                )
                                            }}
                                        </td>
                                        <td
                                            class="py-3 px-4 font-medium text-gray-800"
                                        >
                                            {{
                                                history.user?.name ||
                                                (history.user_id
                                                    ? `User ${history.user_id}`
                                                    : "-")
                                            }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 코멘트 탭 -->
                    <div v-if="activeTab === 'comments'" class="space-y-6">
                        <!-- 코멘트 입력 -->

                        <!-- 코멘트 입력 -->
                        <!-- 로그인 상태 -->
                        <div v-if="isAuthenticated" class="flex gap-4">
                            <div
                                class="flex flex-col items-center gap-1 shrink-0"
                            >
                                <div
                                    class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200"
                                >
                                    <span
                                        class="material-icons-outlined text-blue-600"
                                        >person</span
                                    >
                                </div>
                                <span
                                    class="text-[11px] font-bold text-gray-700"
                                    >{{ user?.name }}</span
                                >
                            </div>
                            <div class="flex-1 space-y-2">
                                <textarea
                                    v-model="newComment"
                                    rows="3"
                                    class="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 text-sm resize-none"
                                    placeholder="리뷰 코멘트를 작성해주세요..."
                                ></textarea>
                                <div class="flex justify-end">
                                    <button
                                        type="button"
                                        @click="addComment"
                                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        :disabled="!newComment.trim()"
                                    >
                                        등록
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 비로그인 상태 -->
                        <div
                            v-else
                            class="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 items-center justify-center text-sm text-gray-500"
                        >
                            <span class="material-icons-outlined text-gray-400"
                                >lock</span
                            >
                            <span>댓글을 작성하려면 로그인이 필요합니다.</span>
                        </div>

                        <!-- 코멘트 리스트 -->
                        <div class="space-y-6">
                            <div
                                v-for="comment in commentTree"
                                :key="comment.id"
                                class="space-y-4"
                            >
                                <!-- 메인 코멘트 -->
                                <div
                                    class="group relative flex gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                    <div
                                        class="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0"
                                    >
                                        <span
                                            class="material-icons-outlined text-gray-400"
                                            >face</span
                                        >
                                    </div>
                                    <div class="flex-1 space-y-1.5">
                                        <div
                                            class="flex items-center justify-between"
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <span
                                                    class="font-bold text-gray-900 text-sm"
                                                >
                                                    {{
                                                        comment.user?.name ||
                                                        (comment.user_id
                                                            ? `User ${comment.user_id}`
                                                            : "Unknown")
                                                    }}
                                                </span>
                                                <span
                                                    v-if="
                                                        isMine(comment.user_id)
                                                    "
                                                    class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100"
                                                >
                                                    나
                                                </span>
                                                <span
                                                    class="text-xs text-gray-500"
                                                >
                                                    {{
                                                        formatDateTime(
                                                            comment.created_at
                                                        )
                                                    }}
                                                </span>
                                                <!-- 내 댓글일 때만 삭제 버튼 노출 -->
                                                <button
                                                    v-if="
                                                        isMine(comment.user_id)
                                                    "
                                                    class="text-gray-300 hover:text-red-500 transition-colors ml-2"
                                                    title="삭제"
                                                >
                                                    <span
                                                        class="material-icons-outlined text-[16px]"
                                                        >delete</span
                                                    >
                                                </button>
                                            </div>
                                        </div>
                                        <p
                                            class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
                                        >
                                            {{ comment.content }}
                                        </p>
                                    </div>
                                    <!-- 답글 버튼 (로그인 시 노출) -->
                                    <button
                                        v-if="isAuthenticated"
                                        @click="toggleReply(comment.id)"
                                        class="absolute top-4 right-4 text-xs font-medium text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                    >
                                        <span
                                            class="material-icons-outlined text-[14px]"
                                            >reply</span
                                        >
                                        답글
                                    </button>
                                </div>

                                <!-- 대댓글 리스트 -->
                                <div
                                    v-if="
                                        comment.replies &&
                                        comment.replies.length > 0
                                    "
                                    class="pl-12 space-y-3"
                                >
                                    <div
                                        v-for="reply in comment.replies"
                                        :key="reply.id"
                                        class="flex gap-4 p-3 rounded-lg bg-gray-50/50 border-l-2 border-blue-100 group"
                                    >
                                        <div
                                            class="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0"
                                        >
                                            <span
                                                class="material-icons-outlined text-gray-400 text-sm"
                                                >face</span
                                            >
                                        </div>
                                        <div class="flex-1 space-y-1">
                                            <div
                                                class="flex items-center justify-between"
                                            >
                                                <div
                                                    class="flex items-center gap-2"
                                                >
                                                    <span
                                                        class="font-bold text-gray-900 text-sm"
                                                    >
                                                        {{
                                                            reply.user?.name ||
                                                            (reply.user_id
                                                                ? `User ${reply.user_id}`
                                                                : "Unknown")
                                                        }}
                                                    </span>
                                                    <span
                                                        v-if="
                                                            isMine(
                                                                reply.user_id
                                                            )
                                                        "
                                                        class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100"
                                                        >나</span
                                                    >
                                                </div>
                                                <div
                                                    class="flex items-center gap-3"
                                                >
                                                    <span
                                                        class="text-xs text-gray-500"
                                                        >{{
                                                            formatDateTime(
                                                                reply.created_at
                                                            )
                                                        }}</span
                                                    >
                                                    <!-- Delete Button for Reply -->
                                                    <button
                                                        v-if="
                                                            isMine(
                                                                reply.user_id
                                                            )
                                                        "
                                                        @click="
                                                            handleDeleteComment(
                                                                reply.id
                                                            )
                                                        "
                                                        class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                                                        title="삭제"
                                                    >
                                                        <span
                                                            class="material-icons-outlined text-sm"
                                                            >delete</span
                                                        >
                                                    </button>
                                                </div>
                                            </div>
                                            <p
                                                class="text-gray-600 text-sm whitespace-pre-wrap"
                                            >
                                                {{ reply.content }}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Reply Input Form -->
                                <div
                                    v-if="replyingTo === comment.id"
                                    class="pl-12 flex gap-3 animate-fade-in"
                                >
                                    <div
                                        class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0"
                                    >
                                        <span
                                            class="material-icons-outlined text-blue-600 text-sm"
                                            >subdirectory_arrow_right</span
                                        >
                                    </div>
                                    <div class="flex-1 space-y-2">
                                        <textarea
                                            v-model="newReply"
                                            rows="2"
                                            class="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 text-sm resize-none"
                                            :placeholder="`${
                                                comment.user?.name || '작성자'
                                            }님에게 답글 작성...`"
                                            ref="replyInput"
                                        ></textarea>
                                        <div class="flex justify-end gap-2">
                                            <button
                                                @click="toggleReply(comment.id)"
                                                class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded transition-colors"
                                            >
                                                취소
                                            </button>
                                            <button
                                                @click="addReply(comment.id)"
                                                class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors shadow-sm"
                                                :disabled="!newReply.trim()"
                                            >
                                                답글 등록
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Empty State -->
                            <div
                                v-if="comments.length === 0"
                                class="text-center py-12 text-gray-500"
                            >
                                <span
                                    class="material-icons-outlined text-4xl mb-2 text-gray-300"
                                    >chat_bubble_outline</span
                                >
                                <p>등록된 리뷰 코멘트가 없습니다.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </template>
    </main>
</template>

<style scoped>
/* 드래그 시 고스트 스타일 */
.sortable-ghost {
    background-color: #eff6ff;
}
</style>
