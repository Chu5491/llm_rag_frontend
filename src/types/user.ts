export enum UserRole {
    ADMIN = "admin",
    USER = "user",
    GUEST = "guest",
}

export interface Company {
    // Assuming minimal company structure based on usage, expand if needed
    id: number;
    name: string;
}

export interface UserBase {
    email: string;
    name: string;
    is_active?: boolean;
}

export interface UserCreate extends UserBase {
    password: string;
    role?: UserRole;
    company_id?: number | null;
}

export interface UserUpdate {
    name?: string | null;
    password?: string | null;
    role?: UserRole | null;
    is_active?: boolean | null;
    company_id?: number | null;
}

export interface User extends UserBase {
    id: number;
    role: UserRole;
    company_id?: number | null;
    created_at: string; // ISO datetime string
    updated_at?: string | null; // ISO datetime string
    company?: Company | null;
}

export interface UserLogin {
    email: string;
    password: string;
}

export interface Token {
    access_token: string;
    token_type: string;
}
