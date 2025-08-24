import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Calendar, 
  Clock, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle,
  User,
  Phone,
  Trash2,
  Eye
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type EventWithRelations } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

const feedbackFormSchema = z.object({
  feedbackQuestion: z.string().min(1, "Pergunta é obrigatória"),
  feedbackResponse: z.string().optional(),
  patientResponded: z.boolean(),
  feedbackCompleted: z.boolean(),
});

type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

export default function Events() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithRelations | null>(null);
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery<EventWithRelations[]>({
    queryKey: ["/api/events"],
  });

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      feedbackQuestion: "",
      feedbackResponse: "",
      patientResponded: false,
      feedbackCompleted: false,
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await apiRequest("PUT", `/api/events/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Sucesso",
        description: "Feedback registrado com sucesso!",
      });
      setIsFeedbackDialogOpen(false);
      setSelectedEvent(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao registrar feedback. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmitFeedback = (data: FeedbackFormData) => {
    if (!selectedEvent) return;

    const updateData = {
      ...data,
      feedbackDate: new Date().toISOString(),
      requiresFeedback: true,
    };

    updateEventMutation.mutate({ id: selectedEvent.id, data: updateData });
  };

  const handleOpenFeedback = (event: EventWithRelations) => {
    setSelectedEvent(event);
    form.reset({
      feedbackQuestion: event.feedbackQuestion || "",
      feedbackResponse: event.feedbackResponse || "",
      patientResponded: event.patientResponded || false,
      feedbackCompleted: event.feedbackCompleted || false,
    });
    setIsFeedbackDialogOpen(true);
  };

  const filteredEvents = events?.filter((event) => {
    const matchesSearch = 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());

    if (showOnlyPending) {
      return matchesSearch && event.requiresFeedback && !event.feedbackCompleted;
    }

    return matchesSearch;
  }) || [];

  const getEventStatusColor = (event: EventWithRelations) => {
    if (event.requiresFeedback && !event.feedbackCompleted) {
      return "bg-red-100 border-red-200 text-red-800"; // Vermelho para feedback pendente
    }
    if (event.feedbackCompleted) {
      return "bg-green-100 border-green-200 text-green-800"; // Verde para concluído
    }
    if (event.status === 'completed') {
      return "bg-blue-100 border-blue-200 text-blue-800"; // Azul para evento concluído
    }
    return "bg-gray-100 border-gray-200 text-gray-800"; // Cinza para agendado
  };

  const getEventStatusBadge = (event: EventWithRelations) => {
    if (event.requiresFeedback && !event.feedbackCompleted) {
      return { variant: "destructive" as const, text: "Feedback Pendente" };
    }
    if (event.feedbackCompleted) {
      return { variant: "default" as const, text: "Feedback Concluído" };
    }
    if (event.status === 'completed') {
      return { variant: "secondary" as const, text: "Concluído" };
    }
    return { variant: "outline" as const, text: "Agendado" };
  };

  const formatEventDate = (date: string) => {
    try {
      return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const pendingFeedbackCount = events?.filter(e => e.requiresFeedback && !e.feedbackCompleted).length || 0;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header 
          title="Agenda e Eventos" 
          description="Gerencie eventos, acompanhamentos e feedbacks obrigatórios"
        />

        <div className="p-8">
          {/* Estatísticas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total de Eventos</p>
                    <p className="text-2xl font-bold">{events?.length || 0}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Feedbacks Pendentes</p>
                    <p className="text-2xl font-bold text-red-600">{pendingFeedbackCount}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Feedbacks Concluídos</p>
                    <p className="text-2xl font-bold text-green-600">
                      {events?.filter(e => e.feedbackCompleted).length || 0}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Taxa de Completude</p>
                    <p className="text-2xl font-bold">
                      {events?.length 
                        ? Math.round((events.filter(e => e.feedbackCompleted).length / events.length) * 100)
                        : 0
                      }%
                    </p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex justify-between items-center mb-6 space-x-4">
            <div className="flex items-center space-x-4">
              <Input
                placeholder="Buscar eventos, pacientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pending-only"
                  checked={showOnlyPending}
                  onCheckedChange={(checked) => setShowOnlyPending(checked === true)}
                />
                <label htmlFor="pending-only" className="text-sm font-medium">
                  Apenas feedbacks pendentes
                </label>
              </div>
            </div>

            {pendingFeedbackCount > 0 && (
              <Badge variant="destructive" className="text-base px-3 py-1">
                {pendingFeedbackCount} feedback{pendingFeedbackCount > 1 ? 's' : ''} pendente{pendingFeedbackCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Lista de Eventos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Eventos ({filteredEvents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredEvents.length > 0 ? (
                <div className="space-y-4">
                  {filteredEvents.map((event) => {
                    const statusBadge = getEventStatusBadge(event);
                    return (
                      <div 
                        key={event.id} 
                        className={`p-4 rounded-lg border ${getEventStatusColor(event)}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-lg">{event.title}</h3>
                              <Badge variant={statusBadge.variant}>
                                {statusBadge.text}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span className="text-sm">{event.patient.name}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm">{formatEventDate(event.scheduledDate.toString())}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4" />
                                <span className="text-sm">{event.patient.phone || 'Sem telefone'}</span>
                              </div>
                            </div>
                            
                            {event.description && (
                              <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                            )}

                            {/* Feedback Info */}
                            {event.feedbackQuestion && (
                              <div className="bg-white/50 p-3 rounded border mt-3">
                                <p className="text-sm font-medium mb-1">Pergunta:</p>
                                <p className="text-sm text-gray-700 mb-2">{event.feedbackQuestion}</p>
                                
                                {event.feedbackResponse && (
                                  <>
                                    <p className="text-sm font-medium mb-1">Resposta:</p>
                                    <p className="text-sm text-gray-700 mb-2">{event.feedbackResponse}</p>
                                  </>
                                )}
                                
                                <div className="flex items-center space-x-4 text-xs text-gray-600">
                                  <span>Paciente respondeu: {event.patientResponded ? 'Sim' : 'Não'}</span>
                                  {event.feedbackDate && (
                                    <span>Coletado em: {formatEventDate(event.feedbackDate.toString())}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenFeedback(event)}
                              className="flex items-center space-x-2"
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span>
                                {event.feedbackCompleted ? 'Ver Feedback' : 'Registrar Feedback'}
                              </span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {showOnlyPending 
                      ? "Nenhum feedback pendente encontrado."
                      : "Nenhum evento encontrado."
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog de Feedback */}
          <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedEvent?.feedbackCompleted ? 'Visualizar Feedback' : 'Registrar Feedback'}
                </DialogTitle>
              </DialogHeader>
              
              {selectedEvent && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">{selectedEvent.title}</h4>
                    <p className="text-sm text-gray-600">Paciente: {selectedEvent.patient.name}</p>
                    <p className="text-sm text-gray-600">
                      Data: {formatEventDate(selectedEvent.scheduledDate.toString())}
                    </p>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitFeedback)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="feedbackQuestion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>O que você perguntou para o paciente? *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Ex: Como você se sente após o procedimento? Está satisfeita com o resultado?"
                                disabled={selectedEvent.feedbackCompleted}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="patientResponded"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={selectedEvent.feedbackCompleted}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>O paciente respondeu?</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="feedbackResponse"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Resposta do paciente</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Digite a resposta do paciente ou marque como 'não respondeu' se necessário"
                                disabled={selectedEvent.feedbackCompleted}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="feedbackCompleted"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={selectedEvent.feedbackCompleted}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Marcar como concluído</FormLabel>
                              <p className="text-sm text-gray-500">
                                Ao marcar como concluído, este evento não aparecerá mais como pendente
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />

                      {!selectedEvent.feedbackCompleted && (
                        <div className="flex justify-end space-x-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsFeedbackDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={updateEventMutation.isPending}>
                            {updateEventMutation.isPending ? "Salvando..." : "Salvar Feedback"}
                          </Button>
                        </div>
                      )}
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