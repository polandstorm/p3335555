
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, Users, Target, DollarSign, Clock, CheckCircle, 
  AlertCircle, TrendingUp, MapPin, Phone, Mail, 
  FileText, Plus, ArrowLeft 
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, isThisMonth, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CollaboratorDetail {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
  };
  city: {
    id: string;
    name: string;
    state: string;
  };
  revenueGoal: string;
  consultationGoal: number;
  isActive: boolean;
  createdAt: string;
}

interface CollaboratorMetrics {
  totalPatients: number;
  activePatients: number;
  stalledPatients: number;
  completedTasks: number;
  pendingTasks: number;
  monthlyRevenue: number;
  weeklyProgress: any;
}

interface PatientWithProcedures {
  id: string;
  name: string;
  phone: string;
  classification: string;
  currentStatus: string;
  nextSteps: string;
  procedures: Array<{
    id: string;
    name: string;
    value: string;
    validityDate: string;
    status: string;
  }>;
  lastConsultationDate?: string;
}

interface AdminTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

export default function CollaboratorDetails() {
  const [, params] = useRoute("/collaborators/:id");
  const collaboratorId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: collaborator, isLoading: loadingCollaborator } = useQuery<CollaboratorDetail>({
    queryKey: ['/api/collaborators', collaboratorId],
    enabled: !!collaboratorId,
  });

  const { data: metrics } = useQuery<CollaboratorMetrics>({
    queryKey: ['/api/collaborators', collaboratorId, 'dashboard'],
    enabled: !!collaboratorId,
  });

  const { data: patients = [] } = useQuery<PatientWithProcedures[]>({
    queryKey: ['/api/patients', 'collaborator', collaboratorId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/patients?collaboratorId=${collaboratorId}`);
      return response.json();
    },
    enabled: !!collaboratorId,
  });

  const { data: tasks = [] } = useQuery<AdminTask[]>({
    queryKey: ['/api/admin/tasks', collaboratorId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/tasks?assignedTo=${collaboratorId}`);
      return response.json();
    },
    enabled: !!collaboratorId,
  });

  if (loadingCollaborator) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div>Carregando...</div>
          </main>
        </div>
      </div>
    );
  }

  if (!collaborator) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Colaborador não encontrado</h2>
              <Link href="/collaborators">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para colaboradores
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const currentMonth = new Date();
  const revenueProgress = collaborator && metrics 
    ? Math.min((metrics.monthlyRevenue / parseFloat(collaborator.revenueGoal || "1")) * 100, 100)
    : 0;

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return "bg-green-500";
    if (progress >= 70) return "bg-yellow-500";
    if (progress >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/collaborators">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold">{collaborator.user.name}</h1>
                  <p className="text-gray-600">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    {collaborator.city.name}, {collaborator.city.state}
                  </p>
                </div>
              </div>
              <Badge variant={collaborator.isActive ? "default" : "secondary"}>
                {collaborator.isActive ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pacientes Totais</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalPatients || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.activePatients || 0} ativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics?.monthlyRevenue || 0)}
                </div>
                <div className="mt-2">
                  <Progress value={revenueProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {revenueProgress.toFixed(1)}% da meta
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tarefas</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.completedTasks || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.pendingTasks || 0} pendentes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pacientes Parados</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {metrics?.stalledPatients || 0}
                </div>
                <p className="text-xs text-muted-foreground">Precisam atenção</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="patients" className="space-y-6">
            <TabsList>
              <TabsTrigger value="patients">Pacientes</TabsTrigger>
              <TabsTrigger value="tasks">Tarefas</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="patients">
              <Card>
                <CardHeader>
                  <CardTitle>Pacientes Gerenciados</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Classificação</TableHead>
                        <TableHead>Status Atual</TableHead>
                        <TableHead>Próximos Passos</TableHead>
                        <TableHead>Última Consulta</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patients.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium">{patient.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{patient.classification || 'Não definida'}</Badge>
                          </TableCell>
                          <TableCell>{patient.currentStatus || 'Não definido'}</TableCell>
                          <TableCell>{patient.nextSteps || 'Não definido'}</TableCell>
                          <TableCell>
                            {patient.lastConsultationDate 
                              ? format(new Date(patient.lastConsultationDate), "dd/MM/yyyy", { locale: ptBR })
                              : 'Nunca'
                            }
                          </TableCell>
                          <TableCell>
                            <Link href={`/patients/${patient.id}`}>
                              <Button variant="outline" size="sm">Ver</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks">
              <Card>
                <CardHeader>
                  <CardTitle>Tarefas Atribuídas</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarefa</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data Limite</TableHead>
                        <TableHead>Completada em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{task.title}</div>
                              <div className="text-sm text-gray-500">{task.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getPriorityColor(task.priority)} text-white`}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(task.status)} text-white`}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {task.dueDate 
                              ? format(new Date(task.dueDate), "dd/MM/yyyy", { locale: ptBR })
                              : 'Sem limite'
                            }
                          </TableCell>
                          <TableCell>
                            {task.completedAt 
                              ? format(new Date(task.completedAt), "dd/MM/yyyy", { locale: ptBR })
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Metas do Mês</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Meta de Receita</span>
                        <span>{formatCurrency(parseFloat(collaborator.revenueGoal || "0"))}</span>
                      </div>
                      <Progress value={revenueProgress} className={`h-3 ${getProgressColor(revenueProgress)}`} />
                      <p className="text-xs text-gray-500 mt-1">
                        {formatCurrency(metrics?.monthlyRevenue || 0)} de {formatCurrency(parseFloat(collaborator.revenueGoal || "0"))}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resumo de Atividades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Pacientes Ativos:</span>
                        <span className="font-semibold">{metrics?.activePatients || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tarefas Concluídas:</span>
                        <span className="font-semibold">{metrics?.completedTasks || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tarefas Pendentes:</span>
                        <span className="font-semibold text-yellow-600">{metrics?.pendingTasks || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pacientes Parados:</span>
                        <span className="font-semibold text-red-600">{metrics?.stalledPatients || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
