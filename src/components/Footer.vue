<template>
    <footer
        class="mt-auto py-8 text-center border-t border-gray-100 bg-white/50"
    >
        <div class="text-sm text-gray-500">
            <p>
                &copy; {{ new Date().getFullYear() }} T-Gen. All rights
                reserved.
            </p>
            <div class="mt-2 flex justify-center space-x-4">
                <a href="#" class="hover:text-gray-900 transition-colors"
                    >이용약관</a
                >
                <span class="text-gray-300">|</span>
                <a href="#" class="hover:text-gray-900 transition-colors"
                    >개인정보처리방침</a
                >
            </div>
        </div>
    </footer>
</template>
