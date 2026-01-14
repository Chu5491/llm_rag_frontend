import {apiClient} from "./apiClient.js";
import {User, UserCreate, UserLogin, Token} from "../types/user.js";

const ENDPOINT = "/user"; // Adjust based on actual backend route

export const userApi = {
    // Login
    login: async (credentials: UserLogin): Promise<Token> => {
        const formData = new FormData();
        formData.append("username", credentials.email);
        formData.append("password", credentials.password);

        return apiClient.post<Token>(`${ENDPOINT}/login`, formData);
    },

    // Register
    // Note: Backend requires a public '/signup' endpoint. See backend_modification_guide.md
    register: async (userData: UserCreate): Promise<User> => {
        return apiClient.post<User>(`${ENDPOINT}/signup`, userData);
    },

    // Get Current User (Me)
    me: async (): Promise<User> => {
        return apiClient.get<User>(`${ENDPOINT}/me`);
    },
};
