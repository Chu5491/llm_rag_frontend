/**
 * API 호출을 위한 중앙 집중식 Fetch Wrapper
 * - Base URL 자동 처리 (Vite Proxy 활용)
 * - JSON 응답 자동 파싱
 * - 공통 에러 처리
 */

export class ApiError extends Error {
    public status: number;
    public statusText: string;
    public data: any;

    constructor(
        message: string,
        status: number,
        statusText: string,
        data?: any
    ) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.statusText = statusText;
        this.data = data;
    }
}

// 요청 옵션 타입
interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
}

const BASE_URL = "/api/v1";

/**
 * URL에 쿼리 파라미터를 추가합니다.
 */
function appendQueryParams(
    url: string,
    params?: Record<string, string | number | boolean>
): string {
    if (!params) return url;
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
        }
    });
    const queryString = searchParams.toString();
    return queryString
        ? `${url}${url.includes("?") ? "&" : "?"}${queryString}`
        : url;
}

/**
 * 공통 fetch 래퍼 함수
 */
async function request<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const {params, headers = {}, ...init} = options;

    // URL 구성
    const url = appendQueryParams(`${BASE_URL}${endpoint}`, params);

    // 기본 헤더 설정 (FormData가 아닐 경우에만 Content-Type 설정)
    const token = localStorage.getItem("accessToken");
    const defaultHeaders: Record<string, string> = {
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
    };

    if (!(init.body instanceof FormData)) {
        defaultHeaders["Content-Type"] = "application/json";
    }

    const config: RequestInit = {
        ...init,
        headers: {
            ...defaultHeaders,
            ...headers,
        },
    };

    try {
        const response = await fetch(url, config);

        // 응답 본문 파싱 (JSON 또는 텍스트)
        let data: any;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text(); // JSON이 아니면 텍스트로 읽음
        }

        if (!response.ok) {
            // 에러 메시지 추출 우선순위: data.detail -> data.message -> response.statusText
            const errorMessage =
                data?.detail ||
                data?.message ||
                response.statusText ||
                "알 수 없는 오류가 발생했습니다.";
            throw new ApiError(
                errorMessage,
                response.status,
                response.statusText,
                data
            );
        }

        return data as T;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        // 네트워크 오류 등 fetch 자체가 실패한 경우
        throw new Error(
            error instanceof Error
                ? error.message
                : "네트워크 요청에 실패했습니다."
        );
    }
}

export const apiClient = {
    get: <T>(endpoint: string, options?: RequestOptions) =>
        request<T>(endpoint, {...options, method: "GET"}),

    post: <T>(endpoint: string, body?: any, options?: RequestOptions) => {
        const isFormData = body instanceof FormData;
        return request<T>(endpoint, {
            ...options,
            method: "POST",
            body: isFormData ? body : JSON.stringify(body),
        });
    },

    put: <T>(endpoint: string, body?: any, options?: RequestOptions) => {
        const isFormData = body instanceof FormData;
        return request<T>(endpoint, {
            ...options,
            method: "PUT",
            body: isFormData ? body : JSON.stringify(body),
        });
    },

    patch: <T>(endpoint: string, body?: any, options?: RequestOptions) => {
        const isFormData = body instanceof FormData;
        return request<T>(endpoint, {
            ...options,
            method: "PATCH",
            body: isFormData ? body : JSON.stringify(body),
        });
    },

    delete: <T>(endpoint: string, options?: RequestOptions) =>
        request<T>(endpoint, {...options, method: "DELETE"}),
};
