import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  DollarSign, 
  Users, 
  Calendar, 
  TrendingUp, 
  Award,
  CheckCircle,
  Clock
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";

export default function MyGoals() {
  const { authState } = useAuth();

  // Check if user is collaborator
  if (authState.user?.role !== 'collaborator') {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
            <p className="text-gray-600 mt-2">Apenas colaboradores podem acessar esta página.</p>
          </div>
        </main>
      </div>
    );
  }

  // Get collaborator data
  const { data: collaborator, isLoading: loadingCollaborator } = useQuery({
    queryKey: ["/api/collaborators", authState.user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/collaborators/user/${authState.user?.id}`);
      return response.json();
    },
    enabled: !!authState.user?.id,
  });

  // Get performance metrics
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["/api/collaborators", "metrics", authState.user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/collaborators/${collaborator?.id}/metrics`);
      return response.json();
    },
    enabled: !!collaborator?.id,
  });

  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Calculate progress percentages
  const revenueProgress = collaborator && metrics 
    ? Math.min((parseFloat(metrics.currentRevenue || "0") / parseFloat(collaborator.revenueGoal || "1")) * 100, 100)
    : 0;

  const consultationProgress = collaborator && metrics
    ? Math.min((parseInt(metrics.currentConsultations || "0") / parseInt(collaborator.consultationGoal || "1")) * 100, 100)
    : 0;

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return "bg-green-500";
    if (progress >= 70) return "bg-yellow-500";
    if (progress >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  const getPerformanceBadge = (progress: number) => {
    if (progress >= 90) return { variant: "default" as const, label: "Excelente", color: "text-green-600" };
    if (progress >= 70) return { variant: "secondary" as const, label: "Bom", color: "text-yellow-600" };
    if (progress >= 50) return { variant: "outline" as const, label: "Regular", color: "text-orange-600" };
    return { variant: "destructive" as const, label: "Abaixo da Meta", color: "text-red-600" };
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Target className="h-8 w-8" />
              Minhas Metas e Performance
            </h1>
            <p className="text-gray-600 mt-2">
              Acompanhe seu progresso e performance no mês de {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}.
            </p>
          </div>

          {loadingCollaborator || loadingMetrics ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Carregando dados de performance...</p>
            </div>
          ) : !collaborator ? (
            <div className="text-center py-12">
              <p className="text-red-600">Erro ao carregar dados do colaborador.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Goals Overview */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Meta de Receita
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          R$ {parseFloat(metrics?.currentRevenue || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <Badge {...getPerformanceBadge(revenueProgress)}>
                          {getPerformanceBadge(revenueProgress).label}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Progresso</span>
                          <span>{revenueProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={revenueProgress} className="w-full" />
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Atual: R$ {parseFloat(metrics?.currentRevenue || "0").toLocaleString('pt-BR')}</span>
                          <span>Meta: R$ {parseFloat(collaborator.revenueGoal || "0").toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Meta de Consultas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          {parseInt(metrics?.currentConsultations || "0")}
                        </span>
                        <Badge {...getPerformanceBadge(consultationProgress)}>
                          {getPerformanceBadge(consultationProgress).label}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Progresso</span>
                          <span>{consultationProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={consultationProgress} className="w-full" />
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Realizadas: {parseInt(metrics?.currentConsultations || "0")}</span>
                          <span>Meta: {parseInt(collaborator.consultationGoal || "0")}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Pacientes Ativos</p>
                        <p className="text-2xl font-bold">{metrics?.activePatients || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Procedimentos Fechados</p>
                        <p className="text-2xl font-bold">{metrics?.completedProcedures || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="text-sm text-gray-600">Follow-ups Pendentes</p>
                        <p className="text-2xl font-bold">{metrics?.pendingFollowups || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">Taxa de Conversão</p>
                        <p className="text-2xl font-bold">{metrics?.conversionRate || 0}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Weekly Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Performance Semanal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Gráfico de performance semanal será implementado em breve.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Goals Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Resumo do Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Objetivos do Mês</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span>Atingir meta de receita</span>
                          {revenueProgress >= 100 ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span>Atingir meta de consultas</span>
                          {consultationProgress >= 100 ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span>Completar todos os follow-ups</span>
                          <Clock className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Conquistas</h3>
                      <div className="space-y-3">
                        {revenueProgress >= 25 && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                            <Award className="h-4 w-4 text-green-600" />
                            <span className="text-green-700">25% da meta de receita atingida</span>
                          </div>
                        )}
                        {consultationProgress >= 25 && (
                          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                            <Award className="h-4 w-4 text-blue-600" />
                            <span className="text-blue-700">25% da meta de consultas atingida</span>
                          </div>
                        )}
                        {(metrics?.activePatients || 0) > 0 && (
                          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                            <Award className="h-4 w-4 text-purple-600" />
                            <span className="text-purple-700">Pacientes ativos sob supervisão</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}