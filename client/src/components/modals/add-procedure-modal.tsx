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

const addProcedureSchema = z.object({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  name: z.string().min(1, "Nome do procedimento é obrigatório"),
  value: z.string().min(1, "Valor é obrigatório"),
  validityDate: z.string().optional(),
  performedDate: z.string().min(1, "Data de realização é obrigatória"),
  notes: z.string().optional(),
});

type AddProcedureFormData = z.infer<typeof addProcedureSchema>;

interface AddProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddProcedureModal({ isOpen, onClose }: AddProcedureModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { authState } = useAuth();

  const { data: patients } = useQuery({
    queryKey: ["/api/patients"],
    enabled: isOpen,
  });

  const form = useForm<AddProcedureFormData>({
    resolver: zodResolver(addProcedureSchema),
    defaultValues: {
      patientId: "",
      name: "",
      value: "",
      validityDate: "",
      performedDate: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  const createProcedureMutation = useMutation({
    mutationFn: async (data: AddProcedureFormData) => {
      const payload = {
        ...data,
        value: data.value,
        collaboratorId: authState.collaborator?.id || "",
        performedDate: new Date(data.performedDate),
        validityDate: data.validityDate ? new Date(data.validityDate) : null,
      };
      return await apiRequest("POST", "/api/procedures", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Procedimento criado com sucesso",
        description: "O procedimento foi adicionado ao sistema.",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar procedimento",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  const onSubmit = (data: AddProcedureFormData) => {
    createProcedureMutation.mutate(data);
  };

  // Filter patients based on user role
  const availablePatients = patients?.filter(patient => {
    if (authState.user?.role === 'admin') {
      return true; // Admin can see all patients
    }
    return patient.collaboratorId === authState.collaborator?.id; // Collaborator can only see their patients
  }) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Procedimento</DialogTitle>
          <DialogDescription>
            Registre um novo procedimento realizado em um paciente.
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Procedimento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Botox facial, Preenchimento labial" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
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

              <FormField
                control={form.control}
                name="performedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Realização</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validityDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Validade (Opcional)</FormLabel>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionais sobre o procedimento..."
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
              <Button type="submit" disabled={createProcedureMutation.isPending}>
                {createProcedureMutation.isPending ? "Salvando..." : "Salvar Procedimento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
