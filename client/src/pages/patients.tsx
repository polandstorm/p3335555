import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { City, PatientWithRelations } from "@shared/schema";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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
import { Search, Filter, Eye, Edit, Trash2, UserX, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AddPatientModal from "@/components/modals/add-patient-modal";

const deactivateFormSchema = z.object({
  reason: z.string().min(1, "Motivo da desativação é obrigatório"),
});

type DeactivateFormData = z.infer<typeof deactivateFormSchema>;

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterClassification, setFilterClassification] = useState("");
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading } = useQuery<PatientWithRelations[]>({
    queryKey: ["/api/patients"],
  });

  const { data: cities = [] } = useQuery<City[]>({
    queryKey: ["/api/cities"],
  });

  const form = useForm<DeactivateFormData>({
    resolver: zodResolver(deactivateFormSchema),
    defaultValues: {
      reason: "",
    },
  });

  const deactivatePatientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: DeactivateFormData }) => {
      const response = await apiRequest("PUT", `/api/patients/${id}/deactivate`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast({
        title: "Sucesso",
        description: "Paciente desativado com sucesso!",
      });
      setIsDeactivateDialogOpen(false);
      setSelectedPatient(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao desativar paciente. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmitDeactivate = (data: DeactivateFormData) => {
    if (!selectedPatient) return;
    deactivatePatientMutation.mutate({ id: selectedPatient.id, data });
  };

  const handleOpenDeactivate = (patient: any) => {
    setSelectedPatient(patient);
    form.reset();
    setIsDeactivateDialogOpen(true);
  };

  const getClassificationColor = (classification?: string) => {
    switch (classification) {
      case "bronze":
        return "classification-bronze text-white";
      case "silver":
        return "classification-silver text-gray-900";
      case "gold":
        return "classification-gold text-gray-900";
      case "diamond":
        return "classification-diamond text-gray-900";
      default:
        return "bg-gray-400 text-white";
    }
  };

  const getClassificationText = (classification?: string) => {
    switch (classification) {
      case "bronze":
        return "Bronze";
      case "silver":
        return "Silver";
      case "gold":
        return "Gold";
      case "diamond":
        return "Diamond";
      default:
        return "Indefinido";
    }
  };

  const filteredPatients = patients.filter((patient: PatientWithRelations) => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = !filterCity || patient.cityId === filterCity;
    const matchesClassification = !filterClassification || patient.classification === filterClassification;
    
    return matchesSearch && matchesCity && matchesClassification;
  }) || [];

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header 
          title="Pacientes" 
          description="Gerencie todos os pacientes do sistema"
          showAddPatient={true}
        />

        <div className="p-8">
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-cities">Todas as cidades</SelectItem>
                    {cities?.map((city: City) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name} - {city.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterClassification} onValueChange={setFilterClassification}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por classificação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as classificações</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="diamond">Diamond</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterCity("");
                    setFilterClassification("");
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Patients Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Lista de Pacientes ({filteredPatients.length})
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
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Classificação</TableHead>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Última Consulta</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.map((patient: PatientWithRelations) => (
                        <TableRow 
                          key={patient.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => window.location.href = `/patients/${patient.id}`}
                        >
                            <TableCell className="font-medium">{patient.name}</TableCell>
                            <TableCell>{patient.phone || "-"}</TableCell>
                            <TableCell>{patient.city?.name || "-"}</TableCell>
                            <TableCell>
                              <Badge className={`${getClassificationColor(patient.classification || undefined)} border-0`}>
                                {getClassificationText(patient.classification || undefined)}
                              </Badge>
                            </TableCell>
                            <TableCell>{patient.collaborator?.user.name || "-"}</TableCell>
                          <TableCell>
                            {patient.lastConsultationDate
                              ? formatDistanceToNow(new Date(patient.lastConsultationDate), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={patient.isRegistrationComplete ? "default" : "secondary"}>
                              {patient.isRegistrationComplete ? "Completo" : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/patients/${patient.id}`;
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeactivate(patient);
                                }}
                                title="Desativar paciente"
                              >
                                <UserX className="h-4 w-4" />
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
                  <p className="text-gray-500">Nenhum paciente encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <AddPatientModal 
        isOpen={isAddPatientOpen} 
        onClose={() => setIsAddPatientOpen(false)} 
      />

      {/* Deactivate Patient Dialog */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Desativar Paciente</DialogTitle>
          </DialogHeader>
          
          {selectedPatient && (
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold mb-2 text-red-800">Atenção!</h4>
                <p className="text-sm text-red-700">
                  Você está prestes a desativar o paciente <strong>{selectedPatient.name}</strong>.
                  Esta ação pode ser revertida por qualquer colaborador posteriormente.
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitDeactivate)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo da Desativação *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Explique detalhadamente o motivo para desativar este paciente..."
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
                      onClick={() => setIsDeactivateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      variant="destructive"
                      disabled={deactivatePatientMutation.isPending}
                    >
                      {deactivatePatientMutation.isPending ? "Desativando..." : "Desativar Paciente"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
