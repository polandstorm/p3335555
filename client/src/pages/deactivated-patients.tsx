import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Search, 
  RotateCcw, 
  Eye, 
  AlertTriangle, 
  User,
  Calendar,
  MessageSquare
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type PatientWithRelations } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const reactivateFormSchema = z.object({
  reason: z.string().min(1, "Motivo da reativação é obrigatório"),
});

type ReactivateFormData = z.infer<typeof reactivateFormSchema>;

export default function DeactivatedPatients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithRelations | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deactivatedPatients, isLoading } = useQuery<PatientWithRelations[]>({
    queryKey: ["/api/patients/deactivated"],
  });

  const form = useForm<ReactivateFormData>({
    resolver: zodResolver(reactivateFormSchema),
    defaultValues: {
      reason: "",
    },
  });

  const reactivatePatientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: ReactivateFormData }) => {
      const response = await apiRequest("PUT", `/api/patients/${id}/reactivate`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients/deactivated'] });
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast({
        title: "Sucesso",
        description: "Paciente reativado com sucesso!",
      });
      setIsReactivateDialogOpen(false);
      setSelectedPatient(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao reativar paciente. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmitReactivate = (data: ReactivateFormData) => {
    if (!selectedPatient) return;
    reactivatePatientMutation.mutate({ id: selectedPatient.id, data });
  };

  const handleOpenReactivate = (patient: PatientWithRelations) => {
    setSelectedPatient(patient);
    form.reset();
    setIsReactivateDialogOpen(true);
  };

  const handleViewPatient = (patient: PatientWithRelations) => {
    setSelectedPatient(patient);
    setIsViewDialogOpen(true);
  };

  const filteredPatients = deactivatedPatients?.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.deactivationReason?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const getClassificationColor = (classification: string | null) => {
    switch (classification) {
      case "bronze": return "bg-amber-100 text-amber-800";
      case "silver": return "bg-gray-100 text-gray-800";
      case "gold": return "bg-yellow-100 text-yellow-800";
      case "diamond": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header 
          title="Pacientes Desativados" 
          description="Visualize e gerencie pacientes desativados com possibilidade de reativação"
        />

        <div className="p-8">
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Desativados</p>
                    <p className="text-2xl font-bold text-red-600">{deactivatedPatients?.length || 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Desativados Hoje</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {deactivatedPatients?.filter(p => 
                        p.deactivatedAt && 
                        format(new Date(p.deactivatedAt), 'dd/MM/yyyy') === format(new Date(), 'dd/MM/yyyy')
                      ).length || 0}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Oportunidades de Reversão</p>
                    <p className="text-2xl font-bold text-green-600">{filteredPatients.length}</p>
                  </div>
                  <RotateCcw className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Busca */}
          <div className="flex justify-between items-center mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, telefone, email ou motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="text-sm text-gray-600">
              <span className="font-medium">Dica:</span> Todos os colaboradores podem tentar reverter estes pacientes
            </div>
          </div>

          {/* Lista de Pacientes Desativados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>Pacientes Desativados ({filteredPatients.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredPatients.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Classificação</TableHead>
                        <TableHead>Colaborador Responsável</TableHead>
                        <TableHead>Data de Desativação</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.map((patient) => (
                        <TableRow key={patient.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <div className="font-medium">{patient.name}</div>
                              <div className="text-sm text-gray-500">
                                {patient.phone} | {patient.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getClassificationColor(patient.classification)}>
                              {patient.classification || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{patient.collaborator?.user?.name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{patient.city?.name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(patient.deactivatedAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm text-gray-700 truncate" title={patient.deactivationReason || ''}>
                                {patient.deactivationReason || 'Sem motivo registrado'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewPatient(patient)}
                                className="flex items-center space-x-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span>Ver</span>
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleOpenReactivate(patient)}
                                className="flex items-center space-x-1"
                              >
                                <RotateCcw className="h-4 w-4" />
                                <span>Reativar</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum paciente desativado encontrado.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Esta é uma boa notícia - significa que não há pacientes desativados!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog de Visualização */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Histórico do Paciente</DialogTitle>
              </DialogHeader>
              
              {selectedPatient && (
                <div className="space-y-6">
                  {/* Informações Básicas */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Informações Básicas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Nome</p>
                        <p className="text-sm">{selectedPatient.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Classificação</p>
                        <Badge className={getClassificationColor(selectedPatient.classification)}>
                          {selectedPatient.classification || 'N/A'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Telefone</p>
                        <p className="text-sm">{selectedPatient.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Email</p>
                        <p className="text-sm">{selectedPatient.email || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Desativação */}
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-semibold mb-3 text-red-800">Informações da Desativação</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Data de Desativação</p>
                        <p className="text-sm">{formatDate(selectedPatient.deactivatedAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Motivo da Desativação</p>
                        <p className="text-sm bg-white p-2 rounded border">
                          {selectedPatient.deactivationReason || 'Sem motivo registrado'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Objetivos e Observações */}
                  {(selectedPatient.clinicGoals || selectedPatient.mainConcerns || selectedPatient.importantNotes) && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold mb-3 text-blue-800">Objetivos e Observações</h4>
                      
                      {selectedPatient.clinicGoals && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-600">Objetivos na Clínica</p>
                          <p className="text-sm bg-white p-2 rounded border">{selectedPatient.clinicGoals}</p>
                        </div>
                      )}
                      
                      {selectedPatient.mainConcerns && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-600">Principais Preocupações</p>
                          <p className="text-sm bg-white p-2 rounded border">{selectedPatient.mainConcerns}</p>
                        </div>
                      )}
                      
                      {selectedPatient.importantNotes && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Anotações Importantes</p>
                          <p className="text-sm bg-white p-2 rounded border">{selectedPatient.importantNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                      Fechar
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Dialog de Reativação */}
          <Dialog open={isReactivateDialogOpen} onOpenChange={setIsReactivateDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Reativar Paciente</DialogTitle>
              </DialogHeader>
              
              {selectedPatient && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">{selectedPatient.name}</h4>
                    <p className="text-sm text-gray-600">
                      Desativado em: {formatDate(selectedPatient.deactivatedAt)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Motivo: {selectedPatient.deactivationReason}
                    </p>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitReactivate)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="reason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Motivo da Reativação *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Explique o motivo para reativar este paciente..."
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsReactivateDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={reactivatePatientMutation.isPending}>
                          {reactivatePatientMutation.isPending ? "Reativando..." : "Reativar Paciente"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}