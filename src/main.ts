import {createApp} from "vue";
import "./style.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

// Material Icons (Filled & Outlined)
import "material-icons/iconfont/material-icons.css";
import "material-icons/iconfont/outlined.css";

// Material Symbols (Outlined)
import "material-symbols/outlined.css";

import {createPinia} from "pinia";

import App from "./App.vue";
import router from "./router/index.js";

createApp(App).use(router).use(createPinia()).mount("#app");
