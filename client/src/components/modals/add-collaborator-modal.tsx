import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const addCollaboratorSchema = z.object({
  // User data
  name: z.string().min(1, "Nome é obrigatório"),
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["admin", "collaborator"]).default("collaborator"),
  
  // Collaborator data
  cityId: z.string().min(1, "Cidade é obrigatória"),
  revenueGoal: z.string().min(1, "Meta de faturamento é obrigatória"),
  consultationGoal: z.string().min(1, "Meta de consultas é obrigatória"),
});

type AddCollaboratorFormData = z.infer<typeof addCollaboratorSchema>;

interface AddCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCollaboratorModal({ isOpen, onClose }: AddCollaboratorModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cities = [] } = useQuery<any[]>({
    queryKey: ["/api/cities"],
    enabled: isOpen,
  });

  const form = useForm<AddCollaboratorFormData>({
    resolver: zodResolver(addCollaboratorSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      role: "collaborator",
      cityId: "",
      revenueGoal: "",
      consultationGoal: "",
    },
  });

  const createCollaboratorMutation = useMutation({
    mutationFn: async (data: AddCollaboratorFormData) => {
      // First create the user
      const userResponse = await apiRequest("POST", "/api/users", {
        name: data.name,
        username: data.username,
        password: data.password,
        role: data.role,
      });
      
      const user = await userResponse.json();

      // Then create the collaborator
      const collaboratorResponse = await apiRequest("POST", "/api/collaborators", {
        userId: user.id,
        cityId: data.cityId,
        revenueGoal: data.revenueGoal,
        consultationGoal: parseInt(data.consultationGoal),
      });

      return collaboratorResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collaborators"] });
      toast({
        title: "Colaborador criado com sucesso",
        description: "O colaborador foi adicionado ao sistema.",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar colaborador",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  const onSubmit = (data: AddCollaboratorFormData) => {
    createCollaboratorMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Colaborador</DialogTitle>
          <DialogDescription>
            Crie um novo colaborador e defina suas metas.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de Usuário</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome de usuário" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Digite a senha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Usuário</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="collaborator">Colaborador</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade de Responsabilidade</FormLabel>
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
                name="revenueGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta de Faturamento (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consultationGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta de Consultas (por mês)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCollaboratorMutation.isPending}>
                {createCollaboratorMutation.isPending ? "Salvando..." : "Salvar Colaborador"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
