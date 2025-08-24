import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
import { Button } from "@/components/ui/button";

const scheduleEventSchema = z.object({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  type: z.enum(["consultation", "followup", "procedure", "return"]),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  scheduledDate: z.string().min(1, "Data e hora são obrigatórias"),
  procedureId: z.string().optional(),
});

type ScheduleEventFormData = z.infer<typeof scheduleEventSchema>;

interface ScheduleEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScheduleEventModal({ isOpen, onClose }: ScheduleEventModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { authState } = useAuth();

  const { data: patients } = useQuery({
    queryKey: ["/api/patients"],
    enabled: isOpen,
  });

  const { data: procedures } = useQuery({
    queryKey: ["/api/procedures"],
    enabled: isOpen,
  });

  const form = useForm<ScheduleEventFormData>({
    resolver: zodResolver(scheduleEventSchema),
    defaultValues: {
      patientId: "",
      type: "consultation",
      title: "",
      description: "",
      scheduledDate: "",
      procedureId: "",
    },
  });

  const watchedType = form.watch("type");
  const watchedPatientId = form.watch("patientId");

  const createEventMutation = useMutation({
    mutationFn: async (data: ScheduleEventFormData) => {
      const payload = {
        ...data,
        collaboratorId: authState.collaborator?.id || "",
        scheduledDate: new Date(data.scheduledDate),
        procedureId: data.procedureId || null,
      };
      return await apiRequest("POST", "/api/events", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/upcoming"] });
      toast({
        title: "Evento agendado com sucesso",
        description: "O evento foi adicionado à agenda.",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao agendar evento",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  const onSubmit = (data: ScheduleEventFormData) => {
    createEventMutation.mutate(data);
  };

  // Filter patients and procedures based on user role
  const availablePatients = patients?.filter(patient => {
    if (authState.user?.role === 'admin') {
      return true;
    }
    return patient.collaboratorId === authState.collaborator?.id;
  }) || [];

  const availableProcedures = procedures?.filter(procedure => {
    if (!watchedPatientId) return false;
    return procedure.patientId === watchedPatientId;
  }) || [];

  const getEventTypeTitle = (type: string) => {
    switch (type) {
      case "consultation":
        return "Consulta";
      case "followup":
        return "Follow-up";
      case "procedure":
        return "Procedimento";
      case "return":
        return "Retorno";
      default:
        return "Evento";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agendar Evento</DialogTitle>
          <DialogDescription>
            Agende um novo evento ou follow-up para um paciente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paciente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um paciente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availablePatients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name} - {patient.city?.name || "Sem cidade"}
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Evento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="consultation">Consulta</SelectItem>
                        <SelectItem value="followup">Follow-up</SelectItem>
                        <SelectItem value="procedure">Procedimento</SelectItem>
                        <SelectItem value="return">Retorno</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={`Ex: ${getEventTypeTitle(watchedType)} - [Nome do Paciente]`}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data e Hora</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedType === "procedure" && availableProcedures.length > 0 && (
                <FormField
                  control={form.control}
                  name="procedureId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Procedimento Relacionado (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um procedimento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nenhum procedimento específico</SelectItem>
                          {availableProcedures.map((procedure) => (
                            <SelectItem key={procedure.id} value={procedure.id}>
                              {procedure.name} - {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(parseFloat(procedure.value))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes adicionais sobre o evento..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createEventMutation.isPending}>
                {createEventMutation.isPending ? "Agendando..." : "Agendar Evento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
