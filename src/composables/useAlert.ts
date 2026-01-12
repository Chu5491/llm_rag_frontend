import {ref} from "vue";

const isVisible = ref(false);
const alertMessage = ref("");
const alertTitle = ref("");
const alertType = ref<"alert" | "confirm">("alert");
let resolvePromise: ((value: boolean) => void) | null = null;

export function useAlert() {
    const showAlert = (message: string, title = "알림") => {
        alertMessage.value = message;
        alertTitle.value = title;
        alertType.value = "alert";
        isVisible.value = true;

        return new Promise<void>((resolve) => {
            resolvePromise = () => {
                resolve();
            };
        });
    };

    const showConfirm = (message: string, title = "확인") => {
        alertMessage.value = message;
        alertTitle.value = title;
        alertType.value = "confirm";
        isVisible.value = true;

        return new Promise<boolean>((resolve) => {
            resolvePromise = resolve;
        });
    };

    const hideAlert = (result = false) => {
        isVisible.value = false;
        alertMessage.value = "";
        alertTitle.value = "";

        if (resolvePromise) {
            resolvePromise(result);
            resolvePromise = null;
        }
    };

    return {
        isVisible,
        alertMessage,
        alertTitle,
        alertType,
        showAlert,
        showConfirm,
        hideAlert,
    };
}
