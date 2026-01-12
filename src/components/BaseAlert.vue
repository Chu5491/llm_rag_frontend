<template>
    <div v-if="isVisible" class="alert-overlay" @click.self="hideAlert">
        <div class="alert-container">
            <!-- Header -->
            <div class="alert-header">
                <h3 class="alert-title">
                    {{ alertTitle }}
                </h3>
            </div>

            <!-- Body -->
            <div class="alert-body">
                <p class="alert-message">
                    {{ alertMessage }}
                </p>
            </div>

            <!-- Footer -->
            <div class="alert-footer">
                <button
                    v-if="alertType === 'confirm'"
                    @click="hideAlert(false)"
                    class="btn-alert-cancel"
                >
                    취소
                </button>
                <button @click="hideAlert(true)" class="btn-alert-confirm">
                    {{ alertType === "confirm" ? "확인" : "확인" }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import {useAlert} from "../composables/useAlert.js";

const {isVisible, alertMessage, alertTitle, alertType, hideAlert} = useAlert();
</script>
