export enum UserRole {
    USER = "USER",
    ADMIN = "ADMIN",
    SUPER_ADMIN = "SUPER_ADMIN",
}

export interface UserBase {
    email: string;
    name: string;
    is_active?: boolean;
}

export interface UserCreate extends UserBase {
    password: string;
    role?: UserRole;
}

export interface UserUpdate {
    name?: string | null;
    password?: string | null;
    role?: UserRole | null;
    is_active?: boolean | null;
}

export interface User extends UserBase {
    id: number;
    role: UserRole;
    created_at: string; // ISO datetime string
    updated_at?: string | null; // ISO datetime string
}

export interface UserLogin {
    email: string;
    password: string;
}

export interface Token {
    access_token: string;
    token_type: string;
}
