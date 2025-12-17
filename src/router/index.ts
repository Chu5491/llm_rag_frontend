import {createRouter, createWebHistory, RouteRecordRaw} from "vue-router";
import Dashboard from "../views/Dashboard.vue";
import Project from "../views/Project.vue";
import ProjectCreate from "../views/ProjectCreate.vue";
import GenerateHistory from "../views/GenerateHistory.vue";
import GenerateCreate from "../views/GenerageCreate.vue";
import RagTest from "../views/RagTest.vue";
import TestCase from "../views/TestCase.vue";
import TestCaseDetail from "../views/TestCaseDetail.vue";
import ProjectDetail from "../views/ProjectDetail.vue";

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
    {
        path: "/project/detail/:id",
        name: "ProjectDetail",
        component: ProjectDetail,
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
        path: "/test",
        name: "test",
        component: RagTest,
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
