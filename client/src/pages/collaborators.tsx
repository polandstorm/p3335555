import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Target, TrendingUp, Edit, Plus, User, Eye, Trash2 } from "lucide-react";
import AddCollaboratorModal from "@/components/modals/add-collaborator-modal";
import CreateTaskModal from "@/components/modals/create-task-modal";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useDeleteCollaborator } from "@/hooks/use-delete-collaborator";

export default function Collaborators() {
  const [isAddCollaboratorOpen, setIsAddCollaboratorOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<any>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isEditingCollaborator, setIsEditingCollaborator] = useState<any>(null);
  const { authState } = useAuth();
  const deleteCollaborator = useDeleteCollaborator();

  const openCreateTask = (collaborator: any) => {
    setSelectedCollaborator(collaborator);
    setIsCreateTaskOpen(true);
  };

  const closeCreateTask = () => {
    setSelectedCollaborator(null);
    setIsCreateTaskOpen(false);
  };

  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ["/api/collaborators"],
  });

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'R$ 0,00'; // Handle invalid number input
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  // Mock performance data - in a real app, this would come from analytics
  const getPerformanceData = (collaborator: any) => {
    const mockRevenue = Math.floor(Math.random() * 40000) + 15000;
    const mockConsultations = Math.floor(Math.random() * 50) + 20;

    // Ensure goals are valid numbers, default to 1 if not to avoid division by zero
    const revenueGoal = parseFloat(collaborator.revenueGoal) || 1;
    const consultationGoal = parseFloat(collaborator.consultationGoal) || 1;

    const revenueProgress = Math.min((mockRevenue / revenueGoal) * 100, 100);
    const consultationProgress = Math.min((mockConsultations / consultationGoal) * 100, 100);

    return {
      currentRevenue: mockRevenue,
      currentConsultations: mockConsultations,
      revenueProgress: isNaN(revenueProgress) ? 0 : revenueProgress,
      consultationProgress: isNaN(consultationProgress) ? 0 : consultationProgress,
    };
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Header
          title="Colaboradores"
          description="Gerencie colaboradores e acompanhe suas metas"
        />

        <div className="p-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Colaboradores</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {Array.isArray(collaborators) ? collaborators.length : 0}
                    </p>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3">
                    <Users className="text-primary w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Meta Total Faturamento</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(
                        Array.isArray(collaborators) ? collaborators.reduce((total: number, c: any) => total + (parseFloat(c.revenueGoal) || 0), 0) : 0
                      )}
                    </p>
                  </div>
                  <div className="bg-green-100 rounded-lg p-3">
                    <Target className="text-green-600 w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Performance Média</p>
                    <p className="text-3xl font-bold text-gray-900">78%</p>
                  </div>
                  <div className="bg-purple-100 rounded-lg p-3">
                    <TrendingUp className="text-purple-600 w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Collaborators Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  Lista de Colaboradores
                </CardTitle>
                {authState.user?.role === 'admin' && (
                  <Button onClick={() => setIsAddCollaboratorOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Colaborador
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : Array.isArray(collaborators) && collaborators.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Meta Faturamento</TableHead>
                        <TableHead>Meta Consultas</TableHead>
                        <TableHead>Faturamento Atual</TableHead>
                        <TableHead>Consultas Atuais</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collaborators.map((collaborator: any) => {
                        const performance = getPerformanceData(collaborator);
                        return (
                          <TableRow key={collaborator.id}>
                            <TableCell className="font-medium">
                              {collaborator.user?.name || 'Nome Indisponível'}
                            </TableCell>
                            <TableCell>{collaborator.city?.name || 'Cidade Indisponível'}</TableCell>
                            <TableCell>{formatCurrency(collaborator.revenueGoal)}</TableCell>
                            <TableCell>{collaborator.consultationGoal}</TableCell>
                            <TableCell>{formatCurrency(performance.currentRevenue)}</TableCell>
                            <TableCell>{performance.currentConsultations}</TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-600">Faturamento:</span>
                                  <Progress value={performance.revenueProgress} className="w-16 h-2" />
                                  <span className="text-xs font-medium">
                                    {Math.round(performance.revenueProgress)}%
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-600">Consultas:</span>
                                  <Progress value={performance.consultationProgress} className="w-16 h-2" />
                                  <span className="text-xs font-medium">
                                    {Math.round(performance.consultationProgress)}%
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={collaborator.isActive ? "default" : "secondary"}>
                                {collaborator.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Link href={`/collaborators/${collaborator.id}`}>
                                  <Button variant="ghost" size="sm" title="Ver Perfil">
                                    <User className="h-4 w-4" />
                                  </Button>
                                </Link>
                                {authState.user?.role === 'admin' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setIsEditingCollaborator(collaborator)}
                                      title="Editar"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openCreateTask(collaborator)}
                                      title="Criar Tarefa"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteCollaborator.mutate(collaborator.id)}
                                      disabled={deleteCollaborator.isPending}
                                      title="Excluir"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum colaborador encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {authState.user?.role === 'admin' && (
        <>
          <AddCollaboratorModal
            isOpen={isAddCollaboratorOpen}
            onClose={() => setIsAddCollaboratorOpen(false)}
          />
          {selectedCollaborator && (
            <CreateTaskModal
              isOpen={isCreateTaskOpen}
              onClose={closeCreateTask}
              collaboratorId={selectedCollaborator.id}
              collaboratorName={selectedCollaborator.user.name}
            />
          )}
          {isEditingCollaborator && (
            <AddCollaboratorModal
              isOpen={!!isEditingCollaborator}
              onClose={() => setIsEditingCollaborator(null)}
              collaboratorToEdit={isEditingCollaborator}
            />
          )}
        </>
      )}
    </div>
  );
}