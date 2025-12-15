<script setup>
import {ref, computed, onMounted} from "vue";
import {useRoute, useRouter} from "vue-router";
import draggable from "vuedraggable";

const route = useRoute();
const router = useRouter();

// URL 파라미터를 통해 수정 모드인지 확인
const isEditMode = computed(() => route.name === "TestCaseEdit");

// 폼 데이터
const formData = ref({
    id: "TCID-001",
    function: "로그인",
    priority: "high",
    scenario: [
        {text: "로그인 페이지 접속"},
        {text: "이메일 입력"},
        {text: "비밀번호 입력"},
        {text: "로그인 클릭"},
        {text: ""},
    ],
    precondition: "",
    expectedResult: "",
    isVerified: true,
    comment: "",
});

// 버전 히스토리
const versionHistory = ref([
    {
        version: "현재 (v. 10)",
        date: "2025-08-08 3:06",
        author: "추경운",
        comment: "",
    },
    {version: "v. 9", date: "2025-08-08 3:00", author: "추경운", comment: ""},
    {version: "v. 8", date: "2025-08-08 2:58", author: "추경운", comment: ""},
    {version: "v. 7", date: "2025-08-08 2:55", author: "추경운", comment: ""},
    {version: "v. 6", date: "2025-08-08 2:48", author: "추경운", comment: ""},
]);

// 시나리오 단계 추가
const addScenarioStep = () => {
    formData.value.scenario.push({text: ""});
};

// 시나리오 단계 제거
const removeScenarioStep = (index) => {
    if (formData.value.scenario.length > 1) {
        formData.value.scenario.splice(index, 1);
    }
};

const activeTab = ref("comments"); // 개발 중 편의를 위해 comments로 설정 (나중에 history로 변경 가능)
const newComment = ref("");
const replyingTo = ref(null); // 현재 답글을 작성 중인 댓글 ID
const newReply = ref(""); // 답글 입력 내용

const comments = ref([
    {
        id: 1,
        author: "김담당",
        content:
            "시나리오 3번 단계가 명확하지 않습니다. 구체적인 에러 메시지를 기재해주세요.",
        date: "2025-08-08 14:30",
        replies: [
            {
                id: 101,
                author: "추경운",
                content:
                    "확인했습니다. '로그인 실패' 메시지가 출력되어야 합니다. 수정하겠습니다.",
                date: "2025-08-08 14:35",
            },
        ],
    },
    {
        id: 2,
        author: "이검수",
        content: "선행조건에 브라우저 버전 명시가 필요해 보입니다.",
        date: "2025-08-08 15:00",
        replies: [],
    },
]);

// 새 댓글 등록
const addComment = () => {
    if (!newComment.value.trim()) return;

    comments.value.unshift({
        id: Date.now(),
        author: "CurrentUser",
        content: newComment.value,
        date: new Date().toLocaleString(),
        replies: [], // 대댓글 배열 초기화
    });
    newComment.value = "";
};

// 답글 모드 토글
const toggleReply = (commentId) => {
    if (replyingTo.value === commentId) {
        replyingTo.value = null;
        newReply.value = "";
    } else {
        replyingTo.value = commentId;
        newReply.value = "";
    }
};

// 답글 등록
const addReply = (commentId) => {
    if (!newReply.value.trim()) return;

    const comment = comments.value.find((c) => c.id === commentId);
    if (comment) {
        comment.replies.push({
            id: Date.now(),
            author: "CurrentUser",
            content: newReply.value,
            date: new Date().toLocaleString(),
        });
    }

    replyingTo.value = null;
    newReply.value = "";
};

// 폼 제출 핸들러
const handleSubmit = () => {
    console.log("Form submitted:", formData.value);
};

// 수정 모드일 경우 기존 데이터 로드
onMounted(() => {
    if (isEditMode.value) {
        // loadTestCase(route.params.id)
    }
});
</script>

<template>
    <main class="p-6 space-y-6">
        <!-- 페이지 헤더 -->
        <header>
            <h1 class="text-2xl font-semibold text-gray-900">
                테스트케이스 {{ isEditMode ? "조회 / 수정" : "생성" }}
            </h1>
            <p class="mt-1 text-sm text-gray-500">
                테스트케이스를 {{ isEditMode ? "수정" : "새로 생성" }}합니다.
            </p>
        </header>

        <!-- 메인 카드 -->
        <section class="rounded-lg bg-white p-6 shadow">
            <form class="space-y-8" @submit.prevent="handleSubmit">
                <!-- Top Row: TC ID & Priority -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <!-- TC ID -->
                    <div class="space-y-2">
                        <label class="block text-sm font-bold text-gray-700">
                            TC ID
                        </label>
                        <input
                            v-model="formData.id"
                            type="text"
                            class="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            :disabled="isEditMode"
                            placeholder="TC ID 입력"
                        />
                    </div>

                    <!-- Priority (Battery Icons) -->
                    <div class="space-y-2 flex flex-col items-end">
                        <label
                            class="block text-sm font-bold text-gray-700 mb-1"
                        >
                            중요도
                        </label>
                        <div class="flex items-center gap-6">
                            <!-- High -->
                            <div
                                class="flex flex-col items-center cursor-pointer"
                            >
                                <input
                                    v-model="formData.priority"
                                    type="radio"
                                    id="imp-high"
                                    value="high"
                                    class="peer hidden"
                                />
                                <label
                                    for="imp-high"
                                    class="flex flex-col items-center gap-1 cursor-pointer text-gray-400 peer-checked:text-blue-600 hover:text-gray-600 transition-colors"
                                >
                                    <span
                                        class="material-symbols-outlined text-3xl rotate-90"
                                        >battery_full</span
                                    >
                                    <span class="text-xs font-bold">HIGH</span>
                                </label>
                            </div>
                            <!-- Medium -->
                            <div
                                class="flex flex-col items-center cursor-pointer"
                            >
                                <input
                                    v-model="formData.priority"
                                    type="radio"
                                    id="imp-med"
                                    value="medium"
                                    class="peer hidden"
                                />
                                <label
                                    for="imp-med"
                                    class="flex flex-col items-center gap-1 cursor-pointer text-gray-400 peer-checked:text-blue-600 hover:text-gray-600 transition-colors"
                                >
                                    <span
                                        class="material-symbols-outlined text-3xl rotate-90"
                                        >battery_horiz_050</span
                                    >
                                    <span class="text-xs font-bold"
                                        >Medium</span
                                    >
                                </label>
                            </div>
                            <!-- Low -->
                            <div
                                class="flex flex-col items-center cursor-pointer"
                            >
                                <input
                                    v-model="formData.priority"
                                    type="radio"
                                    id="imp-low"
                                    value="low"
                                    class="peer hidden"
                                />
                                <label
                                    for="imp-low"
                                    class="flex flex-col items-center gap-1 cursor-pointer text-gray-400 peer-checked:text-blue-600 hover:text-gray-600 transition-colors"
                                >
                                    <span
                                        class="material-symbols-outlined text-3xl rotate-90"
                                        >battery_horiz_075</span
                                    >
                                    <span class="text-xs font-bold">Low</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Function -->
                <div class="space-y-2">
                    <label class="block text-sm font-bold text-gray-700">
                        기능
                    </label>
                    <div class="max-w-md">
                        <input
                            v-model="formData.function"
                            type="text"
                            class="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            placeholder="기능 명을 입력하세요"
                        />
                    </div>
                </div>

                <!-- Scenario (Draggable) -->
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
                        <draggable
                            v-model="formData.scenario"
                            item-key="text"
                            handle=".handle"
                            ghost-class="bg-blue-50"
                        >
                            <template #item="{element, index}">
                                <div class="flex items-center gap-3 py-3 group">
                                    <!-- Drag Handle -->
                                    <div
                                        class="handle cursor-move text-gray-300 group-hover:text-gray-500 transition-colors"
                                    >
                                        <span class="material-icons-outlined"
                                            >drag_indicator</span
                                        >
                                    </div>
                                    <!-- Index -->
                                    <span
                                        class="text-sm font-semibold text-gray-500 w-6"
                                    >
                                        {{ index + 1 }}.
                                    </span>
                                    <!-- Input -->
                                    <input
                                        v-model="element.text"
                                        type="text"
                                        class="flex-1 bg-transparent border-none focus:ring-0 p-0 text-gray-700 font-medium placeholder-gray-400"
                                        placeholder="단계 입력..."
                                    />
                                    <!-- Remove Button -->
                                    <button
                                        type="button"
                                        @click="removeScenarioStep(index)"
                                        class="text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                        <span class="material-icons-outlined"
                                            >remove_circle_outline</span
                                        >
                                    </button>
                                </div>
                            </template>
                        </draggable>
                    </div>
                </div>

                <!-- Precondition & Expected Result -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                                placeholder="선행조건을 입력하세요"
                            ></textarea>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="block text-sm font-bold text-gray-700">
                            기대결과
                        </label>
                        <div
                            class="w-full border border-gray-300 rounded-lg p-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
                        >
                            <textarea
                                v-model="formData.expectedResult"
                                class="w-full h-24 bg-transparent border-none focus:ring-0 resize-none text-sm text-gray-700"
                                placeholder="기대결과를 입력하세요"
                            ></textarea>
                        </div>
                    </div>
                </div>

                <!-- Verification -->
                <div class="pt-6 border-t border-gray-200">
                    <div class="flex items-start gap-12">
                        <label class="text-lg font-bold text-gray-800 mt-1">
                            검증여부
                        </label>
                        <div class="flex flex-col gap-4">
                            <div
                                class="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-xs text-gray-600 max-w-sm"
                            >
                                해당 테스트케이스의 사용 여부를 '사용' 또는
                                '반려'로 선택해 주세요.
                            </div>
                            <div class="flex gap-6">
                                <label
                                    class="flex items-center gap-2 cursor-pointer"
                                >
                                    <input
                                        v-model="formData.isVerified"
                                        type="radio"
                                        :value="true"
                                        class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span class="text-gray-700 font-medium"
                                        >사용</span
                                    >
                                </label>
                                <label
                                    class="flex items-center gap-2 cursor-pointer"
                                >
                                    <input
                                        v-model="formData.isVerified"
                                        type="radio"
                                        :value="false"
                                        class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span class="text-gray-700 font-medium"
                                        >반려</span
                                    >
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Buttons -->
                <div class="flex items-center justify-center gap-4 pt-6">
                    <button
                        type="button"
                        @click="$router.go(-1)"
                        class="px-8 py-2.5 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors shadow-sm"
                    >
                        목록으로
                    </button>
                    <button
                        type="submit"
                        class="px-12 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                    >
                        {{ isEditMode ? "수정" : "저장" }}
                    </button>
                </div>
            </form>
        </section>

        <!-- Review & History Tabs -->
        <section class="rounded-lg bg-white shadow">
            <!-- Tab Headers -->
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

            <!-- Tab Contents -->
            <div class="p-6">
                <!-- History Tab -->
                <div v-if="activeTab === 'history'" class="space-y-4">
                    <div class="flex items-center gap-4 mb-4">
                        <button
                            class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors"
                        >
                            선택한 버전 비교
                        </button>
                        <div
                            class="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-gray-600"
                        >
                            저장 시점들의 이력을 확인하고 버전을 비교하거나
                            복원할 수 있습니다.
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm text-gray-600">
                            <thead class="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th class="py-3 px-4 w-10">
                                        <input
                                            type="checkbox"
                                            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th
                                        class="py-3 px-4 font-medium text-gray-500"
                                    >
                                        버전
                                    </th>
                                    <th
                                        class="py-3 px-4 font-medium text-gray-500"
                                    >
                                        발행일
                                    </th>
                                    <th
                                        class="py-3 px-4 font-medium text-gray-500"
                                    >
                                        변경한 사람
                                    </th>
                                    <th
                                        class="py-3 px-4 font-medium text-gray-500"
                                    >
                                        비고
                                    </th>
                                    <th
                                        class="py-3 px-4 font-medium text-gray-500 text-right"
                                    >
                                        동작
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                <tr
                                    v-for="(version, index) in versionHistory"
                                    :key="index"
                                    class="hover:bg-gray-50 transition-colors"
                                >
                                    <td class="py-3 px-4">
                                        <input
                                            type="checkbox"
                                            class="rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </td>
                                    <td class="py-3 px-4">
                                        <span
                                            :class="
                                                index === 0
                                                    ? 'text-blue-600 font-bold'
                                                    : 'text-blue-600 cursor-pointer hover:underline'
                                            "
                                        >
                                            {{ version.version }}
                                        </span>
                                    </td>
                                    <td class="py-3 px-4">
                                        {{ version.date }}
                                    </td>
                                    <td
                                        class="py-3 px-4 font-medium text-gray-800"
                                    >
                                        {{ version.author }}
                                    </td>
                                    <td class="py-3 px-4 text-gray-500">
                                        {{ version.comment || "-" }}
                                    </td>
                                    <td class="py-3 px-4 text-right">
                                        <a
                                            v-if="index > 0"
                                            href="#"
                                            class="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                        >
                                            복원
                                        </a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Comments Tab -->
                <div v-if="activeTab === 'comments'" class="space-y-6">
                    <!-- Comment Input -->
                    <div class="flex gap-4">
                        <div
                            class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0"
                        >
                            <span class="material-icons-outlined text-blue-600"
                                >person</span
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
                                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                                    :disabled="!newComment.trim()"
                                >
                                    등록
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Comments List -->
                    <div class="space-y-6">
                        <div
                            v-for="comment in comments"
                            :key="comment.id"
                            class="space-y-4"
                        >
                            <!-- Main Comment -->
                            <div
                                class="group flex gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <div
                                    class="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0"
                                >
                                    <span
                                        class="material-icons-outlined text-gray-400"
                                        >face</span
                                    >
                                </div>
                                <div class="flex-1 space-y-1">
                                    <div
                                        class="flex items-center justify-between"
                                    >
                                        <h4
                                            class="font-bold text-gray-900 text-sm"
                                        >
                                            {{ comment.author }}
                                        </h4>
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="text-xs text-gray-500"
                                                >{{ comment.date }}</span
                                            >
                                            <!-- Action Buttons -->
                                            <div
                                                class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <button
                                                    @click="
                                                        toggleReply(comment.id)
                                                    "
                                                    class="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                    title="답글 작성"
                                                >
                                                    <span
                                                        class="material-icons-outlined text-sm"
                                                        >chat_bubble_outline</span
                                                    >
                                                </button>
                                                <button
                                                    class="text-gray-400 hover:text-red-500 flex items-center"
                                                    title="삭제"
                                                >
                                                    <span
                                                        class="material-icons-outlined text-lg"
                                                        >delete</span
                                                    >
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <p
                                        class="text-gray-700 text-sm whitespace-pre-wrap"
                                    >
                                        {{ comment.content }}
                                    </p>
                                </div>
                            </div>

                            <!-- Replies List -->
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
                                                <h4
                                                    class="font-bold text-gray-900 text-sm"
                                                >
                                                    {{ reply.author }}
                                                </h4>
                                                <span
                                                    class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-medium border border-blue-100"
                                                    >Writer</span
                                                >
                                            </div>
                                            <div
                                                class="flex items-center gap-3"
                                            >
                                                <span
                                                    class="text-xs text-gray-500"
                                                    >{{ reply.date }}</span
                                                >
                                                <!-- Delete Button for Reply -->
                                                <button
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
                                    <!-- Delete Button for Reply -->
                                    <button
                                        class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all absolute top-3 right-3"
                                    >
                                        <span
                                            class="material-icons-outlined text-sm"
                                            >delete</span
                                        >
                                    </button>
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
                                        placeholder="답글을 작성해주세요..."
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
    </main>
</template>

<style scoped>
/* 드래그 시 고스트 스타일 */
.sortable-ghost {
    background-color: #eff6ff;
}
</style>
