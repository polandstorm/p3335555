import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Edit, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Gem,
  Search,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";

export default function MyPatients() {
  const { authState } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [editingPatient, setEditingPatient] = useState<any>(null);

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

  // Get collaborator's patients
  const { data: patients, isLoading } = useQuery({
    queryKey: ["/api/patients", "my-patients"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/patients?collaboratorId=${authState.collaborator?.id}`);
      return response.json();
    },
    enabled: !!authState.collaborator?.id,
  });

  const { data: procedures } = useQuery({
    queryKey: ["/api/procedures"],
    enabled: !!authState.collaborator?.id,
  });

  const updatePatientMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/patients/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Paciente atualizado",
        description: "Os dados do paciente foram atualizados com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setEditingPatient(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar paciente",
        description: error.message || "Erro interno do servidor",
      });
    },
  });

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'diamond': return 'bg-cyan-100 text-cyan-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'silver': return 'bg-gray-100 text-gray-800';
      case 'bronze': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'diamond': return '💎';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return '⚪';
    }
  };

  const filteredPatients = patients?.filter((patient: any) => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && patient.currentStatus === 'active') ||
                         (statusFilter === 'followup' && patient.currentStatus === 'followup') ||
                         (statusFilter === 'pending' && !patient.isRegistrationComplete);
    const matchesClassification = classificationFilter === 'all' || patient.classification === classificationFilter;
    
    return matchesSearch && matchesStatus && matchesClassification;
  }) || [];

  const handleUpdatePatient = (updates: any) => {
    if (editingPatient) {
      updatePatientMutation.mutate({
        id: editingPatient.id,
        updates
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Table className="h-8 w-8" />
              Meus Pacientes - Controle Estratégico
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie todos os seus pacientes de forma estratégica e organizada.
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Buscar Paciente</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nome ou telefone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="followup">Em Follow-up</SelectItem>
                      <SelectItem value="pending">Cadastro Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Classificação</Label>
                  <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="diamond">💎 Diamante</SelectItem>
                      <SelectItem value="gold">🥇 Ouro</SelectItem>
                      <SelectItem value="silver">🥈 Prata</SelectItem>
                      <SelectItem value="bronze">🥉 Bronze</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros Avançados
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patients Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pacientes Ativos ({filteredPatients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Status Atual</TableHead>
                      <TableHead>Próximos Passos</TableHead>
                      <TableHead>Última Consulta</TableHead>
                      <TableHead>Procedimentos</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Carregando pacientes...
                        </TableCell>
                      </TableRow>
                    ) : filteredPatients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Nenhum paciente encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPatients.map((patient: any) => (
                        <TableRow key={patient.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-semibold">{patient.name}</p>
                              {patient.phone && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {patient.phone}
                                </div>
                              )}
                              {patient.city && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {patient.city.name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {patient.classification ? (
                              <Badge className={getClassificationColor(patient.classification)}>
                                {getClassificationIcon(patient.classification)} {patient.classification?.toUpperCase()}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">Sem classificação</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {patient.currentStatus || 'Não definido'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm max-w-xs">
                              {patient.nextSteps || 'Não definido'}
                            </p>
                          </TableCell>
                          <TableCell>
                            {patient.lastConsultationDate ? (
                              <div className="flex items-center text-sm">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(patient.lastConsultationDate), 'dd/MM/yyyy', { locale: ptBR })}
                              </div>
                            ) : (
                              <span className="text-gray-400">Sem consulta</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <DollarSign className="h-3 w-3 mr-1" />
                              {patient.procedures?.length || 0} procedimentos
                            </div>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setEditingPatient(patient)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Editar Paciente</DialogTitle>
                                </DialogHeader>
                                {editingPatient && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Classificação</Label>
                                      <Select
                                        value={editingPatient.classification || ""}
                                        onValueChange={(value) => 
                                          setEditingPatient({ ...editingPatient, classification: value })
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione a classificação" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="diamond">💎 Diamante</SelectItem>
                                          <SelectItem value="gold">🥇 Ouro</SelectItem>
                                          <SelectItem value="silver">🥈 Prata</SelectItem>
                                          <SelectItem value="bronze">🥉 Bronze</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Status Atual</Label>
                                      <Input
                                        value={editingPatient.currentStatus || ""}
                                        onChange={(e) => 
                                          setEditingPatient({ ...editingPatient, currentStatus: e.target.value })
                                        }
                                        placeholder="ex: Em tratamento, Aguardando retorno..."
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Próximos Passos</Label>
                                      <Textarea
                                        value={editingPatient.nextSteps || ""}
                                        onChange={(e) => 
                                          setEditingPatient({ ...editingPatient, nextSteps: e.target.value })
                                        }
                                        placeholder="Descreva os próximos passos para este paciente..."
                                        rows={3}
                                      />
                                    </div>
                                    <Button 
                                      onClick={() => handleUpdatePatient({
                                        classification: editingPatient.classification,
                                        currentStatus: editingPatient.currentStatus,
                                        nextSteps: editingPatient.nextSteps
                                      })}
                                      className="w-full"
                                      disabled={updatePatientMutation.isPending}
                                    >
                                      {updatePatientMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                                    </Button>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}