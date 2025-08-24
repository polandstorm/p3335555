import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPatientSchema, type InsertPatient, type City, type CollaboratorWithRelations } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const patientFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  cityId: z.string().min(1, "Cidade é obrigatória"),
  collaboratorId: z.string().optional(),
  classification: z.enum(["bronze", "silver", "gold", "diamond"]).default("bronze"),
});

type PatientFormData = z.infer<typeof patientFormSchema>;

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddPatientModal({ isOpen, onClose }: AddPatientModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cities = [] } = useQuery<City[]>({
    queryKey: ['/api/cities'],
    enabled: isOpen,
  });

  const { data: collaborators = [] } = useQuery<CollaboratorWithRelations[]>({
    queryKey: ['/api/collaborators'],
    enabled: isOpen,
  });

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cityId: "",
      collaboratorId: "",
      classification: "bronze",
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: InsertPatient) => {
      const response = await apiRequest("POST", "/api/patients", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast({
        title: "Sucesso",
        description: "Paciente criado com sucesso!",
      });
      onClose();
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar paciente. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PatientFormData) => {
    const patientData: InsertPatient = {
      ...data,
      email: data.email || null,
      collaboratorId: data.collaboratorId || null,
      isRegistrationComplete: false,
    };
    createPatientMutation.mutate(patientData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Novo Paciente</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" {...field} />
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
                    <FormLabel>Cidade *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma cidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities.map((city) => (
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
                name="collaboratorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colaborador</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um colaborador" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {collaborators.map((collaborator) => (
                          <SelectItem key={collaborator.id} value={collaborator.id}>
                            {collaborator.user.name}
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
                          <SelectValue placeholder="Selecione a classificação" />
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
            </div>



            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPatientMutation.isPending}>
                {createPatientMutation.isPending ? "Criando..." : "Criar Paciente"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}