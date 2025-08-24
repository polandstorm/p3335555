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
import { Search, Plus, Edit2, Trash2, Clock, DollarSign, MessageSquare, Stethoscope } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertProcedureTemplateSchema, type ProcedureTemplate, type InsertProcedureTemplate } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const templateFormSchema = insertProcedureTemplateSchema.extend({
  followupScheduleInput: z.string().default("7,30,90"), // Para facilitar entrada de dados
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

export default function Procedures() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProcedureTemplate | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery<ProcedureTemplate[]>({
    queryKey: ["/api/procedure-templates"],
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      approximateValue: "0",
      validityDays: 90,
      followupScheduleInput: "7,30,90",
      isActive: true,
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: InsertProcedureTemplate) => {
      const response = await apiRequest("POST", "/api/procedure-templates", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procedure-templates'] });
      toast({
        title: "Sucesso",
        description: "Template de procedimento criado com sucesso!",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar template de procedimento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<ProcedureTemplate> }) => {
      const response = await apiRequest("PUT", `/api/procedure-templates/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procedure-templates'] });
      toast({
        title: "Sucesso",
        description: "Template de procedimento atualizado com sucesso!",
      });
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar template de procedimento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/procedure-templates/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procedure-templates'] });
      toast({
        title: "Sucesso",
        description: "Template de procedimento removido com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover template de procedimento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    // Converter string de cronograma para array
    const followupSchedule = data.followupScheduleInput
      .split(',')
      .map(day => day.trim())
      .filter(day => day !== '');

    const templateData: InsertProcedureTemplate = {
      name: data.name,
      description: data.description || null,
      approximateValue: data.approximateValue,
      validityDays: data.validityDays,
      followupSchedule,
      isActive: data.isActive,
    };

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateData });
    } else {
      createTemplateMutation.mutate(templateData);
    }
  };

  const handleEdit = (template: ProcedureTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || "",
      approximateValue: template.approximateValue,
      validityDays: template.validityDays,
      followupScheduleInput: template.followupSchedule.join(','),
      isActive: template.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (template: ProcedureTemplate) => {
    if (confirm(`Tem certeza que deseja remover o template "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const filteredTemplates = templates?.filter((template) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatFollowupDays = (days: string[]) => {
    return days.map(day => `${day} dias`).join(', ');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <Header
          title="Templates de Procedimentos"
          description="Gerencie os modelos de procedimentos com cronograma de acompanhamento"
        />

        <div className="mt-6 flex justify-between items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Novo Template</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Criar Template de Procedimento</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Procedimento *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Harmonização Facial" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="approximateValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Aproximado *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="validityDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Validade (dias) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="90"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="followupScheduleInput"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cronograma Follow-up (dias)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="7,30,90"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-sm text-gray-500">
                            Separe os dias por vírgula (ex: 7,30,90)
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                            <Textarea
                              placeholder="Detalhes sobre o procedimento, cuidados, etc."
                              {...field}
                              value={field.value ?? ""}
                            />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createTemplateMutation.isPending}>
                      {createTemplateMutation.isPending ? "Criando..." : "Criar Template"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Stethoscope className="h-5 w-5" />
              <span>Templates de Procedimentos ({filteredTemplates.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredTemplates.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Procedimento</TableHead>
                      <TableHead>Valor Aproximado</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Follow-up</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{template.name}</div>
                            {template.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {template.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                            {formatCurrency(Number(template.approximateValue))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-blue-600 mr-1" />
                            {template.validityDays} dias
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MessageSquare className="h-4 w-4 text-purple-600 mr-1" />
                            <span className="text-sm">
                              {template.followupSchedule.length > 0
                                ? formatFollowupDays(template.followupSchedule)
                                : "Nenhum"
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.isActive ? "default" : "secondary"}>
                            {template.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(template)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(template)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum template de procedimento encontrado.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Crie um template para começar a gerenciar procedimentos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Template de Procedimento</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Procedimento *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Harmonização Facial" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="approximateValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Aproximado *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="validityDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Validade (dias) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="90"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="followupScheduleInput"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cronograma Follow-up (dias)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="7,30,90"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-sm text-gray-500">
                          Separe os dias por vírgula (ex: 7,30,90)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                          <Textarea
                            placeholder="Detalhes sobre o procedimento, cuidados, etc."
                            {...field}
                            value={field.value ?? ""}
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
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingTemplate(null);
                      form.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateTemplateMutation.isPending}>
                    {updateTemplateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}