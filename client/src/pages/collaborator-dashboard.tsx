import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Edit, 
  Save,
  X,
  TrendingUp,
  Star
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, isAfter, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface PendingEvent {
  id: string;
  title: string;
  type: string;
  scheduledDate: string;
  status: string;
  patient: {
    id: string;
    name: string;
    classification: string;
    phone: string;
  };
}

interface ActivePatient {
  id: string;
  name: string;
  classification: string;
  phone: string;
  currentStatus: string;
  nextStep: string;
  procedures: Array<{
    id: string;
    name: string;
    value: string;
    validityDate: string;
    performedDate: string;
  }>;
  lastConsultation?: string;
}

export default function CollaboratorDashboard() {
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editingNextStep, setEditingNextStep] = useState<string | null>(null);
  const [statusValue, setStatusValue] = useState("");
  const [nextStepValue, setNextStepValue] = useState("");
  const queryClient = useQueryClient();

  // Buscar eventos pendentes
  const { data: pendingEvents = [], isLoading: loadingEvents } = useQuery<PendingEvent[]>({
    queryKey: ['/api/events', 'pending'],
  });

  // Buscar pacientes ativos do colaborador
  const { data: activePatients = [], isLoading: loadingPatients } = useQuery<ActivePatient[]>({
    queryKey: ['/api/patients', 'active'],
  });

  // Mutação para atualizar status do paciente
  const updatePatientStatusMutation = useMutation({
    mutationFn: ({ patientId, field, value }: { patientId: string; field: string; value: string }) =>
      apiRequest('PATCH', `/api/patients/${patientId}`, { [field]: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', 'active'] });
      setEditingStatus(null);
      setEditingNextStep(null);
      setStatusValue("");
      setNextStepValue("");
    },
  });

  // Classificação por prioridade
  const getClassificationPriority = (classification: string) => {
    switch (classification?.toLowerCase()) {
      case 'diamond': return 4;
      case 'gold': return 3;
      case 'silver': return 2;
      case 'bronze': return 1;
      default: return 0;
    }
  };

  // Cores da classificação
  const getClassificationColor = (classification: string) => {
    switch (classification?.toLowerCase()) {
      case 'diamond': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // Ícone da classificação
  const getClassificationIcon = (classification: string) => {
    const priority = getClassificationPriority(classification);
    return Array.from({ length: priority }, (_, i) => (
      <Star key={i} className="h-3 w-3 fill-current" />
    ));
  };

  // Verificar procedimentos vencendo
  const getProcedureUrgency = (patient: ActivePatient) => {
    if (!patient.procedures || patient.procedures.length === 0) return null;
    
    const activeProcedures = patient.procedures.filter(p => 
      isAfter(new Date(p.validityDate), new Date())
    );
    
    if (activeProcedures.length === 0) return null;
    
    const mostUrgent = activeProcedures.reduce((urgent, current) => {
      const urgentDays = differenceInDays(new Date(urgent.validityDate), new Date());
      const currentDays = differenceInDays(new Date(current.validityDate), new Date());
      return currentDays < urgentDays ? current : urgent;
    });
    
    const daysLeft = differenceInDays(new Date(mostUrgent.validityDate), new Date());
    return { procedure: mostUrgent, daysLeft };
  };

  // Ordenar pacientes por prioridade
  const sortedPatients = [...activePatients].sort((a, b) => {
    // Primeiro por procedimentos vencendo
    const aUrgency = getProcedureUrgency(a);
    const bUrgency = getProcedureUrgency(b);
    
    if (aUrgency && bUrgency) {
      if (aUrgency.daysLeft !== bUrgency.daysLeft) {
        return aUrgency.daysLeft - bUrgency.daysLeft;
      }
    } else if (aUrgency && !bUrgency) {
      return -1;
    } else if (!aUrgency && bUrgency) {
      return 1;
    }
    
    // Depois por classificação
    const aPriority = getClassificationPriority(a.classification);
    const bPriority = getClassificationPriority(b.classification);
    return bPriority - aPriority;
  });

  // Eventos pendentes ordenados por data
  const sortedEvents = [...pendingEvents].sort((a, b) => 
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );

  const handleSaveStatus = (patientId: string) => {
    if (statusValue.trim()) {
      updatePatientStatusMutation.mutate({
        patientId,
        field: 'currentStatus',
        value: statusValue
      });
    }
  };

  const handleSaveNextStep = (patientId: string) => {
    if (nextStepValue.trim()) {
      updatePatientStatusMutation.mutate({
        patientId,
        field: 'nextStep',
        value: nextStepValue
      });
    }
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'confirmed': return 'text-blue-600 bg-blue-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header 
          title="Minha Área de Trabalho"
          description="Visão geral dos seus eventos e pacientes prioritários"
        />

        <div className="p-8 space-y-8">
          {/* Eventos Pendentes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span>Eventos Pendentes</span>
                </CardTitle>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  {sortedEvents.length} pendente(s)
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                <div className="text-center py-4">Carregando eventos...</div>
              ) : sortedEvents.length > 0 ? (
                <div className="space-y-3">
                  {sortedEvents.slice(0, 5).map(event => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-yellow-600" />
                        <div>
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-gray-600">{event.patient.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className={`flex items-center space-x-1 ${getClassificationColor(event.patient.classification)} px-2 py-0.5 rounded text-xs`}>
                              {getClassificationIcon(event.patient.classification)}
                              <span>{event.patient.classification?.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(event.scheduledDate), 'dd/MM/yyyy')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(event.scheduledDate), 'HH:mm')}
                        </p>
                        <Badge className={`text-xs mt-1 ${getEventStatusColor(event.status)}`}>
                          {event.status === 'pending' ? 'Pendente' : event.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {sortedEvents.length > 5 && (
                    <p className="text-center text-sm text-gray-500 pt-2">
                      e mais {sortedEvents.length - 5} evento(s)...
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum evento pendente</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pacientes Ativos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>Pacientes Ativos - Por Prioridade</span>
                </CardTitle>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {sortedPatients.length} ativo(s)
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPatients ? (
                <div className="text-center py-4">Carregando pacientes...</div>
              ) : sortedPatients.length > 0 ? (
                <div className="space-y-4">
                  {sortedPatients.slice(0, 10).map(patient => {
                    const urgency = getProcedureUrgency(patient);
                    return (
                      <div key={patient.id} className="border rounded-lg p-4 bg-white">
                        {/* Header do Paciente */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex flex-col">
                              <h3 className="font-medium text-lg">{patient.name}</h3>
                              <p className="text-sm text-gray-600">{patient.phone}</p>
                            </div>
                            <div className={`flex items-center space-x-1 ${getClassificationColor(patient.classification)} px-3 py-1 rounded-full`}>
                              {getClassificationIcon(patient.classification)}
                              <span className="font-medium">{patient.classification?.toUpperCase()}</span>
                            </div>
                          </div>
                          
                          {urgency && (
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              urgency.daysLeft <= 7 ? 'bg-red-100 text-red-800' :
                              urgency.daysLeft <= 30 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{urgency.procedure.name} - {urgency.daysLeft} dias</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Procedimentos Ativos */}
                        {urgency && (
                          <div className="mb-3 p-2 bg-gray-50 rounded">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{urgency.procedure.name}</p>
                                <p className="text-xs text-gray-600">
                                  Válido até: {format(new Date(urgency.procedure.validityDate), 'dd/MM/yyyy')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-green-600">
                                  {formatCurrency(parseFloat(urgency.procedure.value))}
                                </p>
                                <div className={`w-16 h-2 rounded-full mt-1 ${
                                  urgency.daysLeft <= 7 ? 'bg-red-500' :
                                  urgency.daysLeft <= 30 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}></div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Status Atual */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-medium text-gray-600">Status Atual</Label>
                            {editingStatus === patient.id ? (
                              <div className="flex items-center space-x-2 mt-1">
                                <Textarea
                                  value={statusValue}
                                  onChange={(e) => setStatusValue(e.target.value)}
                                  placeholder="Digite o status atual do paciente..."
                                  className="text-sm resize-none"
                                  rows={2}
                                />
                                <div className="flex flex-col space-y-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveStatus(patient.id)}
                                    disabled={!statusValue.trim() || updatePatientStatusMutation.isPending}
                                  >
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingStatus(null);
                                      setStatusValue("");
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded flex-1">
                                  {patient.currentStatus || "Nenhum status definido"}
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingStatus(patient.id);
                                    setStatusValue(patient.currentStatus || "");
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Próximo Passo */}
                          <div>
                            <Label className="text-xs font-medium text-gray-600">Próximo Passo</Label>
                            {editingNextStep === patient.id ? (
                              <div className="flex items-center space-x-2 mt-1">
                                <Textarea
                                  value={nextStepValue}
                                  onChange={(e) => setNextStepValue(e.target.value)}
                                  placeholder="Digite o próximo passo..."
                                  className="text-sm resize-none"
                                  rows={2}
                                />
                                <div className="flex flex-col space-y-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveNextStep(patient.id)}
                                    disabled={!nextStepValue.trim() || updatePatientStatusMutation.isPending}
                                  >
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingNextStep(null);
                                      setNextStepValue("");
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-sm text-gray-800 bg-blue-50 p-2 rounded flex-1">
                                  {patient.nextStep || "Nenhum próximo passo definido"}
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingNextStep(patient.id);
                                    setNextStepValue(patient.nextStep || "");
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {sortedPatients.length > 10 && (
                    <p className="text-center text-sm text-gray-500 pt-2">
                      e mais {sortedPatients.length - 10} paciente(s)...
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum paciente ativo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}