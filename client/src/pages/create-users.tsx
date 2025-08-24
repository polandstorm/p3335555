import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, Bus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function CreateUsers() {
  const { authState } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "collaborator"
  });
  
  const [collaboratorForm, setCollaboratorForm] = useState({
    cityId: "",
    revenueGoal: "",
    consultationGoal: ""
  });

  // Check if user is admin
  if (authState.user?.role !== 'admin') {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
            <p className="text-gray-600 mt-2">Apenas administradores podem acessar esta página.</p>
          </div>
        </main>
      </div>
    );
  }

  const { data: cities } = useQuery({
    queryKey: ["/api/cities"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuário criado com sucesso",
        description: "O novo usuário foi criado e pode fazer login no sistema.",
      });
      setUserForm({ username: "", password: "", name: "", role: "collaborator" });
      setCollaboratorForm({ cityId: "", revenueGoal: "", consultationGoal: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar usuário",
        description: error.message || "Erro interno do servidor",
      });
    },
  });

  const promoteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/users/${userId}/promote`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuário promovido", 
        description: "O usuário agora é administrador."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao promover usuário",
        description: error.message || "Erro interno do servidor",
      });
    },
  });

  const createCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorData: any) => {
      const response = await apiRequest("POST", "/api/collaborators", collaboratorData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Colaborador criado com sucesso",
        description: "O perfil de colaborador foi criado com as metas especificadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/collaborators"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar colaborador",
        description: error.message || "Erro interno do servidor",
      });
    },
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userForm.username || !userForm.password || !userForm.name) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    const newUser = await createUserMutation.mutateAsync(userForm);

    // If creating a collaborator, also create the collaborator profile
    if (userForm.role === 'collaborator' && collaboratorForm.cityId) {
      await createCollaboratorMutation.mutateAsync({
        userId: newUser.id,
        cityId: collaboratorForm.cityId,
        revenueGoal: collaboratorForm.revenueGoal || "0",
        consultationGoal: parseInt(collaboratorForm.consultationGoal || "0"),
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <UserPlus className="h-8 w-8" />
              Criação de Usuários
            </h1>
            <p className="text-gray-600 mt-2">
              Crie novos usuários administradores e colaboradores para o sistema.
            </p>
          </div>

          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Criar Usuário</TabsTrigger>
              <TabsTrigger value="list">Usuários Existentes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Novo Usuário</CardTitle>
                  <CardDescription>
                    Preencha os dados para criar um novo usuário no sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateUser} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Nome de Usuário *</Label>
                        <Input
                          id="username"
                          value={userForm.username}
                          onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                          placeholder="ex: joao.silva"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo *</Label>
                        <Input
                          id="name"
                          value={userForm.name}
                          onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                          placeholder="ex: João Silva"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Senha *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={userForm.password}
                          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                          placeholder="Senha do usuário"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Função</Label>
                        <Select
                          value={userForm.role}
                          onValueChange={(value) => setUserForm({ ...userForm, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="collaborator">Colaborador</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {userForm.role === 'collaborator' && (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardHeader>
                          <CardTitle className="text-lg">Configurações do Colaborador</CardTitle>
                          <CardDescription>
                            Configure as metas e cidade do colaborador.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="city">Cidade</Label>
                              <Select
                                value={collaboratorForm.cityId}
                                onValueChange={(value) => setCollaboratorForm({ ...collaboratorForm, cityId: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a cidade" />
                                </SelectTrigger>
                                <SelectContent>
                                  {cities?.map((city: any) => (
                                    <SelectItem key={city.id} value={city.id}>
                                      {city.name} - {city.state}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="revenueGoal">Meta de Receita (R$)</Label>
                              <Input
                                id="revenueGoal"
                                type="number"
                                value={collaboratorForm.revenueGoal}
                                onChange={(e) => setCollaboratorForm({ ...collaboratorForm, revenueGoal: e.target.value })}
                                placeholder="ex: 50000"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="consultationGoal">Meta de Consultas</Label>
                              <Input
                                id="consultationGoal"
                                type="number"
                                value={collaboratorForm.consultationGoal}
                                onChange={(e) => setCollaboratorForm({ ...collaboratorForm, consultationGoal: e.target.value })}
                                placeholder="ex: 100"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createUserMutation.isPending}
                    >
                      {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Usuários do Sistema</CardTitle>
                  <CardDescription>
                    Lista de todos os usuários cadastrados no sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users?.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {user.role === 'admin' ? <Users className="h-5 w-5" /> : <Bus className="h-5 w-5" />}
                          </div>
                          <div>
                            <h3 className="font-semibold">{user.name}</h3>
                            <p className="text-sm text-gray-600">@{user.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                          </Badge>
                          {user.role !== 'admin' && authState.user?.id !== user.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Promover ${user.name} a administrador?`)) {
                                  promoteUserMutation.mutate(user.id);
                                }
                              }}
                              disabled={promoteUserMutation.isLoading}
                            >
                              Promover a Admin
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}