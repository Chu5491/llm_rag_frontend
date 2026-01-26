import {createRouter, createWebHistory, RouteRecordRaw} from "vue-router";
import Dashboard from "../views/Dashboard.vue";
import Project from "../views/Project.vue";
import ProjectCreate from "../views/ProjectCreate.vue";
import GenerateHistory from "../views/GenerateHistory.vue";
import GenerateCreate from "../views/GenerateCreate.vue";
import TestCase from "../views/TestCase.vue";
import TestCaseDetail from "../views/TestCaseDetail.vue";
import ProjectDetail from "../views/ProjectDetail.vue";
import Setting from "../views/Setting.vue";
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";

const routes: Array<RouteRecordRaw> = [
    {
        path: "/login",
        name: "Login",
        component: LoginView,
        meta: {layout: "empty"},
    },
    {
        path: "/register",
        name: "Register",
        component: RegisterView,
        meta: {layout: "empty"},
    },
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
    {
        path: "/project/detail/:id",
        name: "ProjectDetail",
        component: ProjectDetail,
    },
    {
        path: "/project/update/:id",
        name: "ProjectUpdate",
        component: () => import("../views/ProjectUpdate.vue"),
    },
    {
        path: "/generate",
        name: "GenerateHistory",
        component: GenerateHistory,
    },
    {
        path: "/generate/new",
        name: "GenerateCreate",
        component: GenerateCreate,
    },
    {
        path: "/testcase",
        name: "TestCase",
        component: TestCase,
    },
    {
        path: "/testcase/detail/:id",
        name: "TestCaseDetail",
        component: TestCaseDetail,
        props: true,
    },
    {
        path: "/testcase/duplicate",
        name: "ClusteringView",
        component: () => import("../views/ClusteringView.vue"),
    },
    {
        path: "/setting",
        name: "환경설정",
        component: Setting,
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
