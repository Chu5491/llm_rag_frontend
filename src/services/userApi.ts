import {apiClient} from "./apiClient.js";
import {User, UserCreate, UserLogin, Token} from "../types/user.js";

export const userApi = {
    // Login
    login: async (credentials: UserLogin): Promise<Token> => {
        const formData = new FormData();
        formData.append("username", credentials.email);
        formData.append("password", credentials.password);

        return apiClient.post<Token>(`/user/login`, formData);
    },

    // Register
    register: async (userData: UserCreate): Promise<User> => {
        return apiClient.post<User>(`/user/signup`, userData);
    },

    // Get Current User
    me: async (): Promise<User> => {
        return apiClient.get<User>(`/user/me`);
    },
};
