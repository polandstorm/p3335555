import { useState, useEffect, createContext, useContext, createElement, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, login, logout, type AuthState } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  authState: AuthState;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    collaborator: null,
    isLoading: true,
    error: null,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      return await login(username, password);
    },
    onSuccess: (data) => {
      setAuthState({
        user: data.user,
        collaborator: data.collaborator,
        isLoading: false,
        error: null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${data.user.name}!`,
      });
    },
    onError: (error: any) => {
      setAuthState(prev => ({
        ...prev,
        error: error.message || "Erro ao fazer login",
      }));
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: error.message || "Credenciais inválidas",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      setAuthState({
        user: null,
        collaborator: null,
        isLoading: false,
        error: null,
      });
      queryClient.clear();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro no logout",
        description: error.message || "Erro ao fazer logout",
      });
    },
  });

  useEffect(() => {
    if (currentUser && currentUser.user) {
      setAuthState({
        user: currentUser.user,
        collaborator: currentUser.collaborator || null,
        isLoading: false,
        error: null,
      });
    } else if (error && !isLoading) {
      setAuthState({
        user: null,
        collaborator: null,
        isLoading: false,
        error: error.message || "Erro de autenticação",
      });
    } else if (!isLoading && !currentUser) {
      setAuthState({
        user: null,
        collaborator: null,
        isLoading: false,
        error: null,
      });
    }
  }, [currentUser, error, isLoading]);

  const providerValue: AuthContextType = {
    authState: { ...authState, isLoading: isLoading || authState.isLoading },
    login: async (username: string, password: string) => {
      await loginMutation.mutateAsync({ username, password });
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
  };

  return createElement(AuthContext.Provider, { value: providerValue }, children);
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}