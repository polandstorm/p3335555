import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Target, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Eye,
  MapPin,
  Calendar,
  Award
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Monitoring() {
  const { authState } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");
  const [selectedCity, setSelectedCity] = useState("all");

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

  // Get collaborator performance data
  const { data: collaborators, isLoading } = useQuery({
    queryKey: ["/api/collaborators", "performance", selectedPeriod, selectedCity],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPeriod !== "all") params.append("period", selectedPeriod);
      if (selectedCity !== "all") params.append("cityId", selectedCity);
      
      const response = await fetch(`/api/collaborators/performance?${params}`);
      return response.json();
    },
  });

  const { data: cities } = useQuery({
    queryKey: ["/api/cities"],
  });

  // Get overall metrics
  const { data: overallMetrics } = useQuery({
    queryKey: ["/api/metrics", "overview"],
    queryFn: async () => {
      const response = await fetch("/api/metrics/overview");
      return response.json();
    },
  });

  const getPerformanceColor = (progress: number) => {
    if (progress >= 90) return "text-green-600 bg-green-50";
    if (progress >= 70) return "text-yellow-600 bg-yellow-50";
    if (progress >= 50) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const getPerformanceBadge = (progress: number) => {
    if (progress >= 90) return { variant: "default" as const, label: "Excelente" };
    if (progress >= 70) return { variant: "secondary" as const, label: "Bom" };
    if (progress >= 50) return { variant: "outline" as const, label: "Regular" };
    return { variant: "destructive" as const, label: "Abaixo" };
  };

  const calculateRevenueProgress = (current: string, goal: string) => {
    const currentValue = parseFloat(current || "0");
    const goalValue = parseFloat(goal || "1");
    return Math.min((currentValue / goalValue) * 100, 100);
  };

  const calculateConsultationProgress = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Target className="h-8 w-8" />
              Monitoramento de Performance
            </h1>
            <p className="text-gray-600 mt-2">
              Acompanhe a performance e produtividade de todos os colaboradores.
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current-month">Mês Atual</SelectItem>
                      <SelectItem value="last-month">Mês Passado</SelectItem>
                      <SelectItem value="current-quarter">Trimestre Atual</SelectItem>
                      <SelectItem value="last-quarter">Trimestre Passado</SelectItem>
                      <SelectItem value="current-year">Ano Atual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cidade</label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Cidades</SelectItem>
                      {Array.isArray(cities) && cities.map((city: any) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name} - {city.state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full">
                    Exportar Relatório
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="performance">Performance Individual</TabsTrigger>
              <TabsTrigger value="rankings">Rankings</TabsTrigger>
              <TabsTrigger value="analytics">Análises</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Overall Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Colaboradores Ativos</p>
                        <p className="text-2xl font-bold">{overallMetrics?.activeCollaborators || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Receita Total</p>
                        <p className="text-2xl font-bold">
                          R$ {parseFloat(overallMetrics?.totalRevenue || "0").toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">Consultas Totais</p>
                        <p className="text-2xl font-bold">{overallMetrics?.totalConsultations || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm text-gray-600">Meta Geral</p>
                        <p className="text-2xl font-bold">{overallMetrics?.overallGoalProgress || 0}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Performance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo de Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-center py-8">Carregando dados...</p>
                  ) : !collaborators || collaborators.length === 0 ? (
                    <p className="text-center py-8 text-gray-600">Nenhum dado de performance encontrado.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {collaborators.filter((c: any) => calculateRevenueProgress(c.currentRevenue, c.revenueGoal) >= 90).length}
                        </div>
                        <div className="text-sm text-green-600">Acima de 90% da meta</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          {collaborators.filter((c: any) => {
                            const progress = calculateRevenueProgress(c.currentRevenue, c.revenueGoal);
                            return progress >= 50 && progress < 90;
                          }).length}
                        </div>
                        <div className="text-sm text-yellow-600">Entre 50% e 90% da meta</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {collaborators.filter((c: any) => calculateRevenueProgress(c.currentRevenue, c.revenueGoal) < 50).length}
                        </div>
                        <div className="text-sm text-red-600">Abaixo de 50% da meta</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Individual dos Colaboradores</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-center py-8">Carregando dados...</p>
                  ) : !collaborators || collaborators.length === 0 ? (
                    <p className="text-center py-8 text-gray-600">Nenhum colaborador encontrado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Colaborador</TableHead>
                            <TableHead>Cidade</TableHead>
                            <TableHead>Meta de Receita</TableHead>
                            <TableHead>Meta de Consultas</TableHead>
                            <TableHead>Pacientes Ativos</TableHead>
                            <TableHead>Performance</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {collaborators.map((collaborator: any) => {
                            const revenueProgress = calculateRevenueProgress(
                              collaborator.currentRevenue, 
                              collaborator.revenueGoal
                            );
                            const consultationProgress = calculateConsultationProgress(
                              collaborator.currentConsultations || 0,
                              collaborator.consultationGoal || 1
                            );

                            return (
                              <TableRow key={collaborator.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-semibold">{collaborator.user.name}</p>
                                    <p className="text-sm text-gray-600">@{collaborator.user.username}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {collaborator.city.name}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span>R$ {parseFloat(collaborator.currentRevenue || "0").toLocaleString('pt-BR')}</span>
                                      <span className="text-gray-500">
                                        R$ {parseFloat(collaborator.revenueGoal || "0").toLocaleString('pt-BR')}
                                      </span>
                                    </div>
                                    <Progress value={revenueProgress} className="w-full h-2" />
                                    <span className="text-xs text-gray-500">{revenueProgress.toFixed(1)}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span>{collaborator.currentConsultations || 0}</span>
                                      <span className="text-gray-500">{collaborator.consultationGoal || 0}</span>
                                    </div>
                                    <Progress value={consultationProgress} className="w-full h-2" />
                                    <span className="text-xs text-gray-500">{consultationProgress.toFixed(1)}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-center">
                                    <span className="text-lg font-semibold">{collaborator.activePatients || 0}</span>
                                    <p className="text-xs text-gray-500">pacientes</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge {...getPerformanceBadge(Math.max(revenueProgress, consultationProgress))}>
                                    {getPerformanceBadge(Math.max(revenueProgress, consultationProgress)).label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rankings" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Top Receita
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {collaborators?.slice(0, 5).map((collaborator: any, index: number) => (
                      <div key={collaborator.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold">{collaborator.user.name}</p>
                            <p className="text-sm text-gray-600">{collaborator.city.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            R$ {parseFloat(collaborator.currentRevenue || "0").toLocaleString('pt-BR')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {calculateRevenueProgress(collaborator.currentRevenue, collaborator.revenueGoal).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Top Consultas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {collaborators?.slice(0, 5).map((collaborator: any, index: number) => (
                      <div key={collaborator.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold">{collaborator.user.name}</p>
                            <p className="text-sm text-gray-600">{collaborator.city.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{collaborator.currentConsultations || 0}</p>
                          <p className="text-sm text-gray-600">
                            {calculateConsultationProgress(
                              collaborator.currentConsultations || 0,
                              collaborator.consultationGoal || 1
                            ).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Análises Avançadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Gráficos e análises avançadas serão implementados em breve.</p>
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