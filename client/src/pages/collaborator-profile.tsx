import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Target, DollarSign, Clock, CheckCircle, AlertCircle, TrendingUp, MapPin, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import CreateTaskModal from "@/components/modals/create-task-modal";
import { useAuth } from "@/hooks/use-auth";

interface CollaboratorProfile {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    email?: string;
  };
  city: {
    id: string;
    name: string;
    state: string;
  };
  monthlyGoal: number;
  quarterlyGoal: number;
  yearlyGoal: number;
  salesGoal: number;
  consultationsGoal: number;
  createdAt: string;
}

interface CollaboratorEvent {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledDate: string;
  patient: {
    id: string;
    name: string;
    classification: string;
  };
  procedure?: {
    name: string;
    value: number;
  };
}

interface CollaboratorMetrics {
  totalPatients: number;
  activePatients: number;
  totalProcedures: number;
  monthlyRevenue: number;
  quarterlyRevenue: number;
  yearlyRevenue: number;
  consultationsThisMonth: number;
  goalProgress: {
    monthly: number;
    quarterly: number;
    yearly: number;
    sales: number;
    consultations: number;
  };
}

export default function CollaboratorProfile() {
  const [, params] = useRoute("/collaborators/:id");
  const collaboratorId = params?.id;
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const { authState } = useAuth();

  const { data: collaborator, isLoading: loadingCollaborator } = useQuery<CollaboratorProfile>({
    queryKey: ['/api/collaborators', collaboratorId],
    enabled: !!collaboratorId,
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery<CollaboratorEvent[]>({
    queryKey: ['/api/events', 'collaborator', collaboratorId],
    enabled: !!collaboratorId,
  });

  const { data: metrics } = useQuery<CollaboratorMetrics>({
    queryKey: ['/api/collaborators', collaboratorId, 'metrics'],
    enabled: !!collaboratorId,
  });

  const upcomingEvents = events
    .filter(event => new Date(event.scheduledDate) >= new Date() && event.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 10);

  const pendingEvents = events.filter(event => event.status === 'pending').length;
  const completedEvents = events.filter(event => event.status === 'completed').length;
  const thisMonthEvents = events.filter(event => isThisMonth(new Date(event.scheduledDate)));

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "bronze": return "classification-bronze";
      case "silver": return "classification-silver";
      case "gold": return "classification-gold";
      case "diamond": return "classification-diamond";
      default: return "bg-gray-400";
    }
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600";
      case "scheduled": return "text-blue-600";
      case "pending": return "text-yellow-600";
      case "cancelled": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getEventStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "scheduled": return <Clock className="h-4 w-4" />;
      case "pending": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loadingCollaborator) {
    return <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header title="Carregando..." description="Aguarde..." />
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>;
  }

  if (!collaborator) {
    return <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header title="Erro" description="Colaborador não encontrado" />
      </main>
    </div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header 
          title={`Perfil de ${collaborator.user.name}`}
          description={`Colaborador em ${collaborator.city.name} - ${collaborator.city.state}`}
        />

        <div className="p-8 space-y-8">
          {/* Profile Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {collaborator.user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{collaborator.user.name}</h1>
                    <p className="text-gray-600">@{collaborator.user.username}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{collaborator.city.name} - {collaborator.city.state}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {authState.user?.role === 'admin' && (
                    <Button 
                      onClick={() => setIsCreateTaskOpen(true)}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Criar Tarefa</span>
                    </Button>
                  )}
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Membro desde</p>
                    <p className="font-medium">
                      {format(new Date(collaborator.createdAt), 'MMMM yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pacientes Ativos</p>
                    <p className="text-2xl font-bold">{metrics?.activePatients || 0}</p>
                    <p className="text-xs text-gray-500">Total: {metrics?.totalPatients || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Receita Mensal</p>
                    <p className="text-2xl font-bold">{formatCurrency(metrics?.monthlyRevenue || 0)}</p>
                    <p className="text-xs text-gray-500">Meta: {formatCurrency(collaborator.monthlyGoal || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Consultas/Mês</p>
                    <p className="text-2xl font-bold">{metrics?.consultationsThisMonth || 0}</p>
                    <p className="text-xs text-gray-500">Meta: {collaborator.consultationsGoal || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Procedimentos</p>
                    <p className="text-2xl font-bold">{metrics?.totalProcedures || 0}</p>
                    <p className="text-xs text-gray-500">Este mês</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Progresso das Metas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Meta Mensal</span>
                    <span className="text-sm text-gray-600">{Math.round(metrics?.goalProgress?.monthly || 0)}%</span>
                  </div>
                  <Progress value={metrics?.goalProgress?.monthly || 0} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatCurrency(metrics?.monthlyRevenue || 0)}</span>
                    <span>{formatCurrency(collaborator.monthlyGoal || 0)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Meta Trimestral</span>
                    <span className="text-sm text-gray-600">{Math.round(metrics?.goalProgress?.quarterly || 0)}%</span>
                  </div>
                  <Progress value={metrics?.goalProgress?.quarterly || 0} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatCurrency(metrics?.quarterlyRevenue || 0)}</span>
                    <span>{formatCurrency(collaborator.quarterlyGoal || 0)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Meta Anual</span>
                    <span className="text-sm text-gray-600">{Math.round(metrics?.goalProgress?.yearly || 0)}%</span>
                  </div>
                  <Progress value={metrics?.goalProgress?.yearly || 0} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatCurrency(metrics?.yearlyRevenue || 0)}</span>
                    <span>{formatCurrency(collaborator.yearlyGoal || 0)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Meta de Consultas</span>
                    <span className="text-sm text-gray-600">{Math.round(metrics?.goalProgress?.consultations || 0)}%</span>
                  </div>
                  <Progress value={metrics?.goalProgress?.consultations || 0} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{metrics?.consultationsThisMonth || 0}</span>
                    <span>{collaborator.consultationGoal || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events and Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Próximos Eventos</CardTitle>
                  <Badge variant="outline">{upcomingEvents.length} agendados</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loadingEvents ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {upcomingEvents.map(event => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`flex items-center space-x-1 ${getEventStatusColor(event.status)}`}>
                            {getEventStatusIcon(event.status)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{event.title}</p>
                            <p className="text-xs text-gray-600">{event.patient.name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`${getClassificationColor(event.patient.classification)} rounded w-2 h-2`}></span>
                              <span className="text-xs text-gray-500">{event.patient.classification?.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">
                            {format(new Date(event.scheduledDate), 'dd/MM')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(event.scheduledDate), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum evento agendado</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{pendingEvents}</p>
                    <p className="text-sm text-blue-700">Eventos Pendentes</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{completedEvents}</p>
                    <p className="text-sm text-green-700">Eventos Concluídos</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Este Mês</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total de Eventos</span>
                      <span className="font-medium">{thisMonthEvents.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Receita Gerada</span>
                      <span className="font-medium">{formatCurrency(metrics?.monthlyRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Consultas Realizadas</span>
                      <span className="font-medium">{metrics?.consultationsThisMonth || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button className="w-full" variant="outline">
                    Ver Relatório Detalhado
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modal de Criar Tarefa */}
      {authState.user?.role === 'admin' && (
        <CreateTaskModal
          isOpen={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          collaboratorId={collaborator.id}
          collaboratorName={collaborator.user.name}
        />
      )}
    </div>
  );
}