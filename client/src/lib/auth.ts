import { apiRequest } from "./queryClient";

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'collaborator';
}

export interface Collaborator {
  id: string;
  userId: string;
  cityId: string;
  revenueGoal: string;
  consultationGoal: number;
  isActive: boolean;
  user: User;
  city: {
    id: string;
    name: string;
    state: string;
  };
}

export interface AuthState {
  user: User | null;
  collaborator: Collaborator | null;
  isLoading: boolean;
  error: string | null;
}

export async function login(username: string, password: string) {
  const response = await apiRequest("POST", "/api/auth/login", {
    username,
    password,
  });
  return await response.json();
}

export async function logout() {
  await apiRequest("POST", "/api/auth/logout");
}

export async function getCurrentUser() {
  const response = await apiRequest("GET", "/api/auth/me");
  return await response.json();
}
