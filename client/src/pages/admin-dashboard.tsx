import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar,
  Target,
  BarChart3,
  UserCheck,
  Plus,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { pt } from "date-fns/locale";

interface GlobalStats {
  totalPatients: number;
  activePatients: number;
  stalledPatients: number;
  totalRevenue: number;
  monthlyGrowth: number;
  weeklyGrowth: number;
  topPerformers: any[];
}

interface CollaboratorStats {
  id: string;
  name: string;
  totalPatients: number;
  stalledPatients: number;
  completedTasks: number;
  pendingTasks: number;
  monthlyRevenue: number;
}

interface AdminTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  assignedToCollaborator: {
    id: string;
    user: { name: string };
  };
  patient?: { name: string };
}

export default function AdminDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [selectedCollaborator, setSelectedCollaborator] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium" as const,
    dueDate: "",
    category: "general" as const
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate date ranges based on selected period
  const getDateRange = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case "weekly":
        return {
          startDate: startOfWeek(now),
          endDate: endOfWeek(now)
        };
      case "monthly":
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        };
      case "quarterly":
        return {
          startDate: subMonths(now, 3),
          endDate: now
        };
      default:
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        };
    }
  };

  const dateRange = getDateRange();

  // Fetch global statistics
  const { data: globalStats, isLoading: statsLoading } = useQuery<GlobalStats>({
    queryKey: ['/api/admin/global-stats', selectedPeriod],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString()
      });
      const response = await fetch(`/api/admin/global-stats?${params}`);
      if (!response.ok) throw new Error('Failed to fetch global stats');
      return response.json();
    }
  });

  // Fetch collaborators
  const { data: collaborators } = useQuery({
    queryKey: ['/api/collaborators'],
    queryFn: async () => {
      const response = await fetch('/api/collaborators');
      if (!response.ok) throw new Error('Failed to fetch collaborators');
      return response.json();
    }
  });

  // Fetch admin tasks
  const { data: adminTasks, isLoading: tasksLoading } = useQuery<AdminTask[]>({
    queryKey: ['/api/admin/tasks', selectedCollaborator],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCollaborator && selectedCollaborator !== 'all') {
        params.append('assignedTo', selectedCollaborator);
      }
      const response = await fetch(`/api/admin/tasks?${params}`);
      if (!response.ok) throw new Error('Failed to fetch admin tasks');
      return response.json();
    }
  });

  // Fetch stalled patients
  const { data: stalledPatients } = useQuery({
    queryKey: ['/api/admin/stalled-patients'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stalled-patients');
      if (!response.ok) throw new Error('Failed to fetch stalled patients');
      return response.json();
    }
  });

  // Create admin task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: typeof newTask) => {
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (!response.ok) throw new Error('Failed to create task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks'] });
      setTaskDialogOpen(false);
      setNewTask({
        title: "",
        description: "",
        assignedTo: "",
        priority: "medium",
        dueDate: "",
        category: "general"
      });
      toast({
        title: "Tarefa criada",
        description: "A tarefa foi atribuída com sucesso ao colaborador",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar a tarefa",
        variant: "destructive",
      });
    }
  });

  // Get collaborator stats
  const getCollaboratorStats = async (collaboratorId: string): Promise<CollaboratorStats> => {
    const response = await fetch(`/api/collaborators/${collaboratorId}/dashboard`);
    if (!response.ok) throw new Error('Failed to fetch collaborator stats');
    const data = await response.json();
    const collaborator = collaborators?.find((c: any) => c.id === collaboratorId);
    return {
      id: collaboratorId,
      name: collaborator?.user?.name || 'N/A',
      ...data
    };
  };

  const handleCreateTask = () => {
    if (!newTask.title || !newTask.assignedTo) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e colaborador são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    createTaskMutation.mutate(newTask);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">
            Visão completa das atividades dos colaboradores e performance da empresa
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Atribuir Nova Tarefa</DialogTitle>
                <DialogDescription>
                  Crie uma tarefa específica para um colaborador
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título*</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Ligar para paciente X"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newTask.description}
                    onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detalhes da tarefa..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="assignedTo">Colaborador*</Label>
                  <Select value={newTask.assignedTo} onValueChange={(value) => setNewTask(prev => ({ ...prev, assignedTo: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {collaborators?.map((collaborator: any) => (
                        <SelectItem key={collaborator.id} value={collaborator.id}>
                          {collaborator.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select value={newTask.priority} onValueChange={(value: any) => setNewTask(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="dueDate">Data Limite</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending}>
                    {createTaskMutation.isPending ? "Criando..." : "Criar Tarefa"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Global Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats?.totalPatients || 0}</div>
            <p className="text-xs text-muted-foreground">
              {globalStats?.activePatients || 0} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Parados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{globalStats?.stalledPatients || 0}</div>
            <p className="text-xs text-muted-foreground">
              Necessitam atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {globalStats?.totalRevenue?.toLocaleString('pt-BR') || '0,00'}
            </div>
            <p className="text-xs text-muted-foreground">
              No período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crescimento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{globalStats?.monthlyGrowth || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs. período anterior
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="collaborators" className="space-y-4">
        <TabsList>
          <TabsTrigger value="collaborators">Colaboradores</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="stalled">Pacientes Parados</TabsTrigger>
        </TabsList>

        <TabsContent value="collaborators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Performance dos Colaboradores
              </CardTitle>
              <CardDescription>
                Acompanhe o desempenho de cada colaborador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {collaborators?.map((collaborator: any) => (
                  <CollaboratorPerformanceCard 
                    key={collaborator.id} 
                    collaborator={collaborator}
                    getStats={getCollaboratorStats}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Tarefas Administrativas
                  </CardTitle>
                  <CardDescription>
                    Gerencie e acompanhe tarefas atribuídas aos colaboradores
                  </CardDescription>
                </div>
                
                <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os colaboradores</SelectItem>
                    {collaborators?.map((collaborator: any) => (
                      <SelectItem key={collaborator.id} value={collaborator.id}>
                        {collaborator.user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasksLoading ? (
                  <div>Carregando tarefas...</div>
                ) : adminTasks?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma tarefa encontrada
                  </div>
                ) : (
                  adminTasks?.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stalled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Pacientes Parados
              </CardTitle>
              <CardDescription>
                Pacientes que necessitam atenção imediata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stalledPatients?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum paciente parado encontrado
                  </div>
                ) : (
                  stalledPatients?.map((item: any) => (
                    <StalledPatientCard key={item.id} item={item} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Collaborator Performance Card Component
function CollaboratorPerformanceCard({ collaborator, getStats }: any) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/collaborators', collaborator.id, 'dashboard'],
    queryFn: () => getStats(collaborator.id)
  });

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const completionRate = stats?.totalPatients > 0 
    ? ((stats?.totalPatients - stats?.stalledPatients) / stats?.totalPatients) * 100 
    : 0;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{collaborator.user.name}</h3>
          <p className="text-sm text-muted-foreground">{collaborator.city.name}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">R$ {stats?.monthlyRevenue?.toLocaleString('pt-BR') || '0,00'}</div>
          <p className="text-xs text-muted-foreground">Receita mensal</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="font-medium">{stats?.totalPatients || 0}</div>
          <div className="text-muted-foreground">Pacientes</div>
        </div>
        <div>
          <div className="font-medium text-orange-600">{stats?.stalledPatients || 0}</div>
          <div className="text-muted-foreground">Parados</div>
        </div>
        <div>
          <div className="font-medium">{stats?.pendingTasks || 0}</div>
          <div className="text-muted-foreground">Pendências</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Taxa de Progresso</span>
          <span>{completionRate.toFixed(1)}%</span>
        </div>
        <Progress value={completionRate} className="h-2" />
      </div>

      {stats?.pendingTasks > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stats.pendingTasks} tarefa(s) pendente(s) necessitam atenção
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Task Card Component
function TaskCard({ task }: { task: AdminTask }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/admin/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks'] });
      toast({
        title: "Tarefa atualizada",
        description: "Status da tarefa foi atualizado com sucesso",
      });
    }
  });

  const handleStatusChange = (newStatus: string) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: { status: newStatus }
    });
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={getPriorityColor(task.priority)}>
              {task.priority}
            </Badge>
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
              {task.status}
            </span>
            {task.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: pt })}
              </span>
            )}
          </div>
        </div>
        
        <div className="text-right text-sm">
          <div className="font-medium">{task.assignedToCollaborator.user.name}</div>
          {task.patient && (
            <div className="text-muted-foreground">Paciente: {task.patient.name}</div>
          )}
        </div>
      </div>

      {task.status === 'pending' && (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleStatusChange('in_progress')}
            disabled={updateTaskMutation.isPending}
          >
            Marcar em Progresso
          </Button>
          <Button 
            size="sm"
            onClick={() => handleStatusChange('completed')}
            disabled={updateTaskMutation.isPending}
          >
            Marcar como Concluída
          </Button>
        </div>
      )}
    </div>
  );
}

// Stalled Patient Card Component
function StalledPatientCard({ item }: any) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{item.patient.name}</h3>
          <p className="text-sm text-muted-foreground">
            Colaborador: {item.collaborator.user.name}
          </p>
        </div>
        <div className="text-right">
          <div className="font-bold text-orange-600">
            {item.daysSinceLastContact} dias
          </div>
          <div className="text-xs text-muted-foreground">sem contato</div>
        </div>
      </div>
      
      {item.stallReason && (
        <p className="text-sm text-muted-foreground bg-orange-50 p-2 rounded">
          <strong>Motivo:</strong> {item.stallReason}
        </p>
      )}
      
      {item.nextAction && (
        <p className="text-sm">
          <strong>Próxima ação:</strong> {item.nextAction}
        </p>
      )}
    </div>
  );
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'default';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'cancelled': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}