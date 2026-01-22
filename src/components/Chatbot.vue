<script setup lang="ts">
import {ref, nextTick, onMounted, computed} from "vue";
import {
    sendChatMessage,
    fetchProjects,
    fetchHistories,
} from "../services/api.js";
import {marked} from "marked";
import type {ProjectResponse} from "../types/project.js";
import type {GenerationItem} from "../types/Generate.js";

interface Message {
    text: string;
    sender: "user" | "bot";
}

// 퀵 액션 도구 정의
const quickActions = [
    {
        id: "tc_lookup",
        label: "TC 조회",
        icon: "search",
        color: "text-blue-600 bg-blue-50 border-blue-100 ring-blue-200",
    },
    {
        id: "history_stats",
        label: "생성 이력",
        icon: "history",
        color: "text-purple-600 bg-purple-50 border-purple-100 ring-purple-200",
    },
    {
        id: "project_stats",
        label: "프로젝트 현황",
        icon: "analytics",
        color: "text-emerald-600 bg-emerald-50 border-emerald-100 ring-emerald-200",
    },
];

const isOpen = ref(false);
const chatContainerRef = ref<HTMLElement | null>(null);
const newMessage = ref("");
const isLoading = ref(false);
const messages = ref<Message[]>([
    {text: "안녕하세요! 무엇을 도와드릴까요?", sender: "bot"},
]);

// 툴 상태 관리
const activeTool = ref<string | null>(null);
const projects = ref<ProjectResponse[]>([]);
const formData = ref({
    projectId: null as number | null,
    historyId: null as number | null,
    historyTitle: "",
    tcId: "",
});
const histories = ref<GenerationItem[]>([]);

// 프로젝트 목록 로드
const loadProjects = async () => {
    if (projects.value.length > 0) return;
    try {
        projects.value = await fetchProjects();
    } catch (e) {
        console.error("Failed to load projects", e);
    }
};

// 프로젝트 선택 시 히스토리 로드
const handleProjectChange = async () => {
    formData.value.historyId = null;
    formData.value.historyTitle = "";
    histories.value = [];

    if (formData.value.projectId) {
        try {
            histories.value = await fetchHistories(formData.value.projectId);
        } catch (e) {
            console.error("Failed to load histories", e);
        }
    }
};

// 히스토리 선택 핸들러
const handleHistoryChange = () => {
    const selectedHistory = histories.value.find(
        (h) => h.id === formData.value.historyId
    );
    if (selectedHistory) {
        formData.value.historyTitle = selectedHistory.title;
    }
};

// 도구 선택 핸들러
const selectTool = async (toolId: string) => {
    activeTool.value = toolId;
    activeTool.value = toolId;
    formData.value = {
        projectId: null,
        historyId: null,
        historyTitle: "",
        tcId: "",
    }; // 초기화
    await loadProjects();

    // 자동 스크롤 (폼이 잘 보이게)
    scrollToBottom();
};

// 도구 실행 (프롬프트 생성 및 전송)
const submitTool = async () => {
    if (!activeTool.value) return;

    let prompt = "";
    const selectedProject = projects.value.find(
        (p) => p.id === formData.value.projectId
    );
    const projectName = selectedProject ? selectedProject.name : "전체";

    switch (activeTool.value) {
        case "tc_lookup":
            if (
                !formData.value.tcId ||
                !selectedProject ||
                !formData.value.historyId
            )
                return;
            prompt = `프로젝트 '${projectName}', 히스토리 '${formData.value.historyTitle}', 태그ID '${formData.value.tcId}'에 해당하는 테스트케이스 정보를 조회해줘.`;
            break;
        case "history_stats":
            prompt = selectedProject
                ? `프로젝트 '${projectName}'의 "테스트케이스 생성 작업 이력(History)"에 대한 상태별(성공/실패/진행중) 통계를 조회해줘.`
                : `전체 프로젝트의 "테스트케이스 생성 작업 이력(History)"에 대한 상태별(성공/실패/진행중) 통계를 조회해줘.`;
            break;
        case "project_stats":
            if (!selectedProject) return;
            prompt = `프로젝트 '${projectName}'에 등록된 "전체 테스트케이스(TC)"의 상태별 개수 현황을 조회해줘.`;
            break;
    }

    // 폼 닫기
    activeTool.value = null;

    // 메시지 전송 로직 태우기 (사용자가 직접 친 것처럼)
    newMessage.value = prompt;
    await sendMessage();
};

// 도구 취소
const cancelTool = () => {
    activeTool.value = null;
};

// Markdown string -> HTML string 변환
const renderMarkdown = (content: string): string => {
    return marked(content, {
        breaks: true,
        gfm: true,
    }) as string;
};

const toggleChat = () => {
    isOpen.value = !isOpen.value;
    if (isOpen.value) {
        scrollToBottom();
    }
};

const scrollToBottom = async () => {
    await nextTick();
    if (chatContainerRef.value) {
        chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
    }
};

const sendMessage = async () => {
    const userMessage = newMessage.value.trim();
    if (!userMessage || isLoading.value) return;

    // 유저 메시지 추가
    messages.value.push({
        text: userMessage,
        sender: "user",
    });

    // 입력 필드 초기화
    newMessage.value = "";

    // 로딩 시작
    isLoading.value = true;
    scrollToBottom();

    try {
        // 전체 대화 기록을 API 포맷으로 변환
        const chatHistory = messages.value.map((msg) => ({
            role:
                msg.sender === "user"
                    ? ("user" as const)
                    : ("assistant" as const),
            content: msg.text,
        }));
        // API 메시지 전송 처리 (히스토리 포함)
        const response = await sendChatMessage(chatHistory);

        // 응답 메시지 추가
        messages.value.push({
            text: response.output,
            sender: "bot",
        });
    } catch (error) {
        console.error("채팅 오류:", error);
        messages.value.push({
            text: "채팅을 처리하는 중 오류가 발생했습니다. 나중에 다시 시도해주세요.",
            sender: "bot",
        });
    } finally {
        isLoading.value = false;
        scrollToBottom();
    }
};
</script>

<template>
    <div class="fixed bottom-4 right-6 z-50 flex flex-col items-end space-y-3">
        <!-- 챗봇 창 -->
        <div
            v-if="isOpen"
            class="w-[400px] h-[600px] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden border border-gray-200"
        >
            <!-- 헤더 -->
            <div
                class="bg-indigo-600 text-white p-3 flex justify-between items-center"
            >
                <h3 class="font-medium">챗봇 도우미</h3>
                <button
                    @click="isOpen = false"
                    class="text-white hover:text-gray-200"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clip-rule="evenodd"
                        />
                    </svg>
                </button>
            </div>

            <!-- 채팅 내용 -->
            <div
                ref="chatContainerRef"
                class="flex-1 p-4 overflow-y-auto bg-gray-50"
            >
                <div
                    v-for="(message, index) in messages"
                    :key="index"
                    :class="[
                        'mb-4',
                        message.sender === 'user' ? 'text-right' : 'text-left',
                    ]"
                >
                    <div
                        v-if="message.sender === 'bot'"
                        class="prose max-w-none inline-block px-4 py-2 rounded-lg bg-white border border-gray-200"
                        v-html="renderMarkdown(message.text)"
                    ></div>
                    <div
                        v-else
                        class="inline-block px-4 py-2 rounded-lg bg-indigo-100 text-gray-800"
                    >
                        {{ message.text }}
                    </div>
                </div>
                <div
                    v-if="isLoading"
                    class="text-center py-2 text-gray-500 text-sm"
                >
                    답변을 생성 중입니다...
                </div>
            </div>

            <!-- Tool Input Form Overlay -->
            <div
                v-if="activeTool"
                class="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-10 rounded-t-2xl animate-slide-up"
            >
                <div class="flex justify-between items-center mb-3">
                    <span
                        class="text-sm font-bold text-gray-800 flex items-center gap-2"
                    >
                        <span
                            class="material-icons-outlined text-base text-indigo-500"
                        >
                            {{
                                quickActions.find((a) => a.id === activeTool)
                                    ?.icon
                            }}
                        </span>
                        {{
                            quickActions.find((a) => a.id === activeTool)?.label
                        }}
                        입력
                    </span>
                    <button
                        @click="cancelTool"
                        class="text-gray-400 hover:text-gray-600"
                    >
                        <span class="material-icons-outlined text-sm"
                            >close</span
                        >
                    </button>
                </div>

                <form @submit.prevent="submitTool" class="space-y-3">
                    <!-- Project Select -->
                    <div>
                        <label
                            class="block text-xs font-bold text-gray-500 mb-1"
                            >프로젝트 선택</label
                        >
                        <select
                            v-model="formData.projectId"
                            @change="handleProjectChange"
                            required
                            class="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option :value="null" disabled>
                                프로젝트를 선택하세요
                            </option>
                            <option
                                v-for="p in projects"
                                :key="p.id"
                                :value="p.id"
                            >
                                {{ p.name }}
                            </option>
                        </select>
                    </div>

                    <!-- History Select (TC Lookup Only) -->
                    <div
                        v-if="activeTool === 'tc_lookup' && formData.projectId"
                    >
                        <label
                            class="block text-xs font-bold text-gray-500 mb-1"
                            >히스토리 선택</label
                        >
                        <select
                            v-model="formData.historyId"
                            @change="handleHistoryChange"
                            required
                            class="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option :value="null" disabled>
                                히스토리를 선택하세요
                            </option>
                            <option
                                v-for="h in histories"
                                :key="h.id"
                                :value="h.id"
                            >
                                {{ h.title }} ({{ h.id }})
                            </option>
                        </select>
                    </div>

                    <!-- TC Link Input (Specific Tool Only) -->
                    <div v-if="activeTool === 'tc_lookup'">
                        <label
                            class="block text-xs font-bold text-gray-500 mb-1"
                            >테스트케이스 ID</label
                        >
                        <input
                            type="text"
                            v-model="formData.tcId"
                            placeholder="예: 101, TC-2024..."
                            required
                            class="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        class="w-full py-2 bg-indigo-600 text-white rounded font-bold text-sm hover:bg-indigo-700 transition-colors"
                    >
                        전송하기
                    </button>
                </form>
            </div>

            <div class="bg-white border-t border-gray-200">
                <!-- 퀵 액션 바 -->
                <div
                    class="px-3 pt-2 pb-1 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2"
                >
                    <button
                        v-for="action in quickActions"
                        :key="action.id"
                        @click="selectTool(action.id)"
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border transition-all"
                        :class="action.color + ' hover:brightness-95'"
                    >
                        <span class="material-icons-outlined text-[14px]">{{
                            action.icon
                        }}</span>
                        {{ action.label }}
                    </button>
                </div>

                <div class="p-3 pt-1">
                    <div class="flex space-x-2">
                        <input
                            v-model="newMessage"
                            @keyup.enter="sendMessage"
                            type="text"
                            placeholder="메시지를 입력하세요..."
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            :disabled="isLoading"
                        />
                        <button
                            @click="sendMessage"
                            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                            :disabled="isLoading || !newMessage.trim()"
                        >
                            전송
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 챗봇 아이콘 -->
        <button
            @click="toggleChat"
            class="w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
            :class="{'rotate-45': isOpen}"
            aria-label="챗봇 열기"
        >
            <svg
                v-if="!isOpen"
                xmlns="http://www.w3.org/2000/svg"
                class="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
            </svg>
            <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                class="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                />
            </svg>
        </button>
    </div>
</template>

<style scoped>
/* 애니메이션을 위한 스타일 */
.rotate-45 {
    transform: rotate(45deg);
    transition: transform 0.3s ease;
}

/* Animations */
.animate-slide-up {
    animation: slideUp 0.3s ease-out forwards;
}

@keyframes slideUp {
    from {
        transform: translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

/* Utilities */
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
}

/* 마크다운 스타일링 */
:deep(.prose) {
    line-height: 1.6;
    font-size: 0.9375rem;
    color: #1f2937;
}

:deep(.prose h1) {
    font-size: 1.5em;
    font-weight: bold;
    margin: 1em 0 0.5em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #e5e7eb;
}

:deep(.prose h2) {
    font-size: 1.3em;
    font-weight: 600;
    margin: 1.2em 0 0.5em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #e5e7eb;
}

:deep(.prose h3) {
    font-size: 1.1em;
    font-weight: 600;
    margin: 1em 0 0.5em;
}

:deep(.prose p) {
    margin: 0.75em 0;
    line-height: 1.7;
}

:deep(.prose ul),
:deep(.prose ol) {
    margin: 0.75em 0;
    padding-left: 1.5em;
}

:deep(.prose li) {
    margin: 0.4em 0;
    padding-left: 0.25em;
}

:deep(.prose pre) {
    background-color: #f9fafb;
    padding: 1em;
    border-radius: 0.5em;
    overflow-x: auto;
    margin: 1em 0;
    border: 1px solid #e5e7eb;
    font-size: 0.9em;
    line-height: 1.5;
}

:deep(.prose code) {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    background-color: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 0.25em;
    font-size: 0.9em;
}

:deep(.prose pre code) {
    background-color: transparent;
    padding: 0;
    border-radius: 0;
    font-size: 1em;
}

:deep(.prose a) {
    color: #4f46e5;
    text-decoration: none;
    font-weight: 500;
}

:deep(.prose a:hover) {
    text-decoration: underline;
    color: #4338ca;
}

:deep(.prose blockquote) {
    border-left: 4px solid #e5e7eb;
    padding-left: 1em;
    margin: 1em 0;
    color: #6b7280;
    font-style: italic;
}

:deep(.prose table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
}

:deep(.prose th),
:deep(.prose td) {
    border: 1px solid #e5e7eb;
    padding: 0.5em 1em;
    text-align: left;
}

:deep(.prose th) {
    background-color: #f9fafb;
    font-weight: 600;
}

:deep(.prose img) {
    max-width: 100%;
    height: auto;
    border-radius: 0.5em;
    margin: 1em 0;
}

/* 스크롤바 스타일링 */
.overflow-y-auto::-webkit-scrollbar {
    width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
    background: #c7d2fe;
    border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #a5b4fc;
}
</style>
