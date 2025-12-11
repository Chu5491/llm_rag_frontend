import {createRouter, createWebHistory, RouteRecordRaw} from "vue-router";
import Dashboard from "../views/Dashboard.vue";
import Project from "../views/Project.vue";
import ProjectCreate from "../views/ProjectCreate.vue";

const routes: Array<RouteRecordRaw> = [
    {
        path: "/",
        name: "Dashboard",
        component: Dashboard,
    },
    {
        path: "/project",
        name: "Project",
        component: Project,
    },
    {
        path: "/project/new",
        name: "ProjectCreate",
        component: ProjectCreate,
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
