import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PatientWithRelations, City, CollaboratorWithRelations } from "@shared/schema";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const completeRegistrationSchema = z.object({
  phone: z.string().min(1, "Telefone é obrigatório"),
  cityId: z.string().min(1, "Cidade é obrigatória"),
  classification: z.enum(["bronze", "silver", "gold", "diamond"]).optional(),
  collaboratorId: z.string().min(1, "Colaborador é obrigatório"),
  currentStatus: z.string().optional(),
  nextSteps: z.string().optional(),
  lastConsultationDate: z.string().optional(),
  // Novos campos para fechamento de procedimentos
  consultationResult: z.enum(["procedure_closed", "no_closure", "missed"]),
  closedProcedureTemplateId: z.string().optional(),
  procedureValue: z.string().optional(),
  consultationNotes: z.string().optional(),
}).refine((data) => {
  if (data.consultationResult === "procedure_closed") {
    return data.closedProcedureTemplateId && data.procedureValue;
  }
  return true;
}, {
  message: "Procedimento e valor são obrigatórios quando o paciente fecha um procedimento",
  path: ["closedProcedureTemplateId"],
});

type CompleteRegistrationFormData = z.infer<typeof completeRegistrationSchema>;

export default function PendingRegistrations() {
  const [selectedPatient, setSelectedPatient] = useState<PatientWithRelations | null>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: incompletePatients = [], isLoading } = useQuery<PatientWithRelations[]>({
    queryKey: ["/api/patients/incomplete"],
  });

  const { data: cities = [] } = useQuery<City[]>({
    queryKey: ["/api/cities"],
  });

  const { data: collaborators = [] } = useQuery<CollaboratorWithRelations[]>({
    queryKey: ["/api/collaborators"],
  });

  const { data: procedureTemplates = [] } = useQuery({
    queryKey: ["/api/procedure-templates"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const form = useForm<CompleteRegistrationFormData>({
    resolver: zodResolver(completeRegistrationSchema),
    defaultValues: {
      phone: "",
      cityId: "",
      classification: undefined,
      collaboratorId: "",
      currentStatus: "",
      nextSteps: "",
      lastConsultationDate: "",
      consultationResult: "no_closure", // Default to no_closure
      closedProcedureTemplateId: "",
      procedureValue: "",
      consultationNotes: "",
    },
  });

  const completeRegistrationMutation = useMutation({
    mutationFn: async (data: CompleteRegistrationFormData) => {
      if (!selectedPatient) throw new Error("Nenhum paciente selecionado");

      const updateData = {
        phone: data.phone,
        cityId: data.cityId,
        classification: data.classification,
        collaboratorId: data.collaboratorId,
        currentStatus: data.currentStatus,
        nextSteps: data.nextSteps,
        isRegistrationComplete: true,
        lastConsultationDate: data.lastConsultationDate ? new Date(data.lastConsultationDate) : new Date(),
        followupStatus: data.consultationResult === 'procedure_closed' ? 'active' : 
                       data.consultationResult === 'no_closure' ? 'no_closure' : 'missed',
      };

      // Atualizar o paciente
      const response = await apiRequest("PUT", `/api/patients/${selectedPatient.id}`, updateData);

      // Se fechou procedimento, criar o procedimento
      if (data.consultationResult === 'procedure_closed' && data.closedProcedureTemplateId && data.procedureValue) {
        const template = procedureTemplates.find(t => t.id === data.closedProcedureTemplateId);
        if (template) {
          await apiRequest("POST", "/api/procedures", {
            templateId: data.closedProcedureTemplateId,
            patientId: selectedPatient.id,
            name: template.name,
            value: parseFloat(data.procedureValue),
            collaboratorId: data.collaboratorId,
            performedDate: new Date(),
            status: 'completed',
            validUntil: new Date(Date.now() + (template.validityDays * 24 * 60 * 60 * 1000)),
            notes: data.consultationNotes,
          });
        }
      }

      // Criar nota no prontuário
      await apiRequest("POST", `/api/patients/${selectedPatient.id}/notes`, {
        content: data.consultationNotes || `Cadastro completado - ${
          data.consultationResult === 'procedure_closed' ? 'Procedimento fechado' :
          data.consultationResult === 'no_closure' ? 'Sem fechamento' : 'Paciente faltou'
        }`,
        type: data.consultationResult === 'procedure_closed' ? 'procedure' : 
              data.consultationResult === 'missed' ? 'missed' : 'note',
        title: 'Completar Cadastro',
        amount: data.consultationResult === 'procedure_closed' ? data.procedureValue : undefined,
      });

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients/incomplete"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Cadastro completado com sucesso",
        description: "O paciente foi adicionado completamente ao sistema.",
      });
      form.reset();
      setIsCompleteModalOpen(false);
      setSelectedPatient(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao completar cadastro",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  const handleCompleteRegistration = (patient: PatientWithRelations) => {
    setSelectedPatient(patient);
    form.reset({
      phone: patient.phone || "",
      cityId: patient.cityId || "",
      classification: patient.classification || undefined,
      collaboratorId: patient.collaboratorId || "",
      currentStatus: patient.currentStatus || "",
      nextSteps: patient.nextSteps || "",
      lastConsultationDate: patient.lastConsultationDate ? 
        new Date(patient.lastConsultationDate).toISOString().split('T')[0] : "",
      consultationResult: patient.followupStatus === 'procedure_closed' ? 'procedure_closed' :
                         patient.followupStatus === 'no_closure' ? 'no_closure' :
                         patient.followupStatus === 'missed' ? 'missed' : 'no_closure', // Default
      closedProcedureTemplateId: patient.procedures?.[0]?.templateId || "",
      procedureValue: patient.procedures?.[0]?.value.toString() || "",
      consultationNotes: patient.notes?.[0]?.content || "",
    });
    setIsCompleteModalOpen(true);
  };

  const onSubmit = (data: CompleteRegistrationFormData) => {
    completeRegistrationMutation.mutate(data);
  };

  const totalPending = incompletePatients.length;
  const oldestPending = incompletePatients.length > 0 ?
    formatDistanceToNow(new Date(incompletePatients[0].createdAt), { addSuffix: true, locale: ptBR }) :
    "-";

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Header 
          title="Cadastros Pendentes" 
          description="Complete o cadastro de pacientes adicionados pelo administrador"
        />

        <div className="p-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cadastros Pendentes</p>
                    <p className="text-3xl font-bold text-gray-900">{totalPending}</p>
                  </div>
                  <div className="bg-orange-100 rounded-lg p-3">
                    <Clock className="text-orange-600 w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-orange-600 text-sm font-medium">Requer atenção</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Mais Antigo</p>
                    <p className="text-lg font-bold text-gray-900">{oldestPending}</p>
                  </div>
                  <div className="bg-red-100 rounded-lg p-3">
                    <AlertTriangle className="text-red-600 w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Prioridade</p>
                    <p className="text-lg font-bold text-gray-900">Alta</p>
                  </div>
                  <div className="bg-yellow-100 rounded-lg p-3">
                    <AlertTriangle className="text-yellow-600 w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Patients Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Pacientes com Cadastro Pendente ({totalPending})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : incompletePatients && incompletePatients.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Classificação</TableHead>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incompletePatients.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium">{patient.name}</TableCell>
                          <TableCell>
                            {patient.phone ? (
                              patient.phone
                            ) : (
                              <Badge variant="secondary">Não informado</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {patient.city ? (
                              patient.city.name
                            ) : (
                              <Badge variant="secondary">Não informado</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {patient.classification ? (
                              <Badge className={`${
                                patient.classification === "bronze" ? "classification-bronze text-white" :
                                patient.classification === "silver" ? "classification-silver text-gray-900" :
                                patient.classification === "gold" ? "classification-gold text-gray-900" :
                                patient.classification === "diamond" ? "classification-diamond text-gray-900" :
                                "bg-gray-400 text-white"
                              } border-0`}>
                                {patient.classification === "bronze" ? "Bronze" :
                                 patient.classification === "silver" ? "Silver" :
                                 patient.classification === "gold" ? "Gold" :
                                 patient.classification === "diamond" ? "Diamond" : "Indefinido"}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Não informado</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {patient.collaborator ? (
                              patient.collaborator.user.name
                            ) : (
                              <Badge variant="secondary">Não atribuído</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(patient.createdAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">Incompleto</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCompleteRegistration(patient)}
                              className="flex items-center space-x-2"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Completar</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Todos os cadastros estão completos!
                  </h3>
                  <p className="text-gray-500">
                    Não há pacientes com cadastro pendente no momento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Complete Registration Modal */}
      <Dialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Completar Cadastro do Paciente</DialogTitle>
            <DialogDescription>
              Complete as informações do paciente: {selectedPatient?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma cidade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cities?.map((city) => (
                              <SelectItem key={city.id} value={city.id}>
                                {city.name} - {city.state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="classification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Classificação</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma classificação" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bronze">Bronze</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="diamond">Diamond</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="collaboratorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Colaborador Responsável</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um colaborador" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {collaborators?.map((collaborator) => (
                              <SelectItem key={collaborator.id} value={collaborator.id}>
                                {collaborator.user.name} - {collaborator.city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastConsultationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data da Última Consulta</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="currentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status Atual</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o status atual do paciente..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nextSteps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Próximos Passos</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva os próximos passos para este paciente..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Resultado da Consulta */}
                <div className="col-span-2 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Resultado da Consulta</h3>

                  <FormField
                    control={form.control}
                    name="consultationResult"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>O que aconteceu na consulta? *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o resultado da consulta" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="procedure_closed">Paciente fechou procedimento</SelectItem>
                            <SelectItem value="no_closure">Não fechou nenhum procedimento</SelectItem>
                            <SelectItem value="missed">Paciente faltou na consulta</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("consultationResult") === "procedure_closed" && (
                    <>
                      <FormField
                        control={form.control}
                        name="closedProcedureTemplateId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Procedimento Fechado *</FormLabel>
                            <Select onValueChange={(value) => {
                              field.onChange(value);
                              const template = procedureTemplates.find(t => t.id === value);
                              if (template) {
                                form.setValue("procedureValue", template.defaultPrice.toString());
                              }
                            }} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o procedimento que foi fechado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {procedureTemplates.map((template: any) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name} - R$ {parseFloat(template.defaultPrice).toFixed(2)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="procedureValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor do Procedimento (R$) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="consultationNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações da Consulta</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Adicione observações sobre como foi a consulta..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCompleteModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={completeRegistrationMutation.isPending}>
                    {completeRegistrationMutation.isPending ? "Salvando..." : "Completar Cadastro"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}