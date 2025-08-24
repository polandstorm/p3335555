import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authState } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authState.isLoading && !authState.user) {
      setLocation("/login");
    }
  }, [authState.isLoading, authState.user, setLocation]);

  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!authState.user) {
    return null;
  }

  return <>{children}</>;
}
