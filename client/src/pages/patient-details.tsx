import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, DollarSign, Calendar, FileText, Plus, Clock, CheckCircle, XCircle, UserX } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import type { PatientWithRelations, Procedure, Event } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface PatientNote {
  id: string;
  content: string;
  date: string;
  type: 'note' | 'procedure' | 'appointment' | 'missed' | 'payment' | 'status';
  title?: string;
  amount?: string;
}

export default function PatientDetails() {
  const [, params] = useRoute("/patients/:id");
  const patientId = params?.id;
  const [newNote, setNewNote] = useState<Omit<PatientNote, 'id' | 'date'>>({
    content: "",
    type: 'note',
    title: "",
    amount: "",
  });
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: patient, isLoading } = useQuery<PatientWithRelations>({
    queryKey: ['/api/patients', patientId],
    enabled: !!patientId,
  });

  const { data: procedures = [] } = useQuery<Procedure[]>({
    queryKey: ['/api/procedures', patientId],
    enabled: !!patientId,
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events', patientId],
    enabled: !!patientId,
  });

  const { data: notes = [] } = useQuery<PatientNote[]>({
    queryKey: ['/api/patients', patientId, 'notes'],
    enabled: !!patientId,
  });

  const { data: procedureTemplates = [] } = useQuery<any[]>({
    queryKey: ['/api/procedure-templates'],
    enabled: !!patientId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      const response = await apiRequest("POST", `/api/patients/${patientId}/notes`, noteData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'notes'] });
      setNewNote({ content: "", type: "note", title: "", amount: "" });
      toast({ title: "Nota adicionada com sucesso" });
    },
  });

  const uploadFile = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/patients/${patientId}/files`, {
        method: "POST",
        body: formData,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'notes'] });
      toast({ title: "Arquivo adicionado com sucesso" });
    },
  });

  const deactivatePatientMutation = useMutation({
    mutationFn: (data: { reason: string }) =>
      apiRequest("PUT", `/api/patients/${patientId}/deactivate`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'notes'] });
      setIsDeactivateDialogOpen(false);
      setDeactivateReason("");
    },
  });

  const updatePhotoMutation = useMutation({
    mutationFn: (photoData: FormData) =>
      fetch(`/api/patients/${patientId}/photo`, {
        method: 'POST',
        body: photoData,
        credentials: 'include',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId] });
    },
  });

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('photo', file);
      updatePhotoMutation.mutate(formData);
    }
  };

  const handleAddNote = () => {
    const noteData = {
      ...newNote,
      date: new Date().toISOString(),
    };
    addNoteMutation.mutate(noteData);
  };

  const handleDeactivate = () => {
    deactivatePatientMutation.mutate({ reason: deactivateReason });
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'diamond': return 'bg-purple-100 text-purple-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'silver': return 'bg-gray-100 text-gray-800';
      case 'bronze': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'procedure': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'appointment': return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'missed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'payment': return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'status': return <UserX className="h-4 w-4 text-red-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

    const totalSpent = procedures.reduce((sum: number, proc: any) =>
      sum + (proc.status === 'completed' ? parseFloat(proc.value) : 0), 0);

    const activeProcedures = procedures.filter((proc: any) => proc.status === 'active');
    const completedProcedures = procedures.filter((proc: any) => proc.status === 'completed');

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <div>Carregando...</div>
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <div>Paciente não encontrado</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 ml-64">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Info */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={patient?.photo} />
                        <AvatarFallback className="text-2xl">
                          {patient?.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <label className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 cursor-pointer hover:bg-primary/90">
                        <Camera className="h-3 w-3" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold">{patient?.name}</h1>
                      <Badge className={getClassificationColor(patient?.classification || undefined)}>
                        {patient?.classification?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Telefone</Label>
                    <p className="text-sm">{patient?.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Email</Label>
                    <p className="text-sm">{patient?.email || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Cidade</Label>
                    <p className="text-sm">{patient?.city?.name} - {patient?.city?.state}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Data de Cadastro</Label>
                    <p className="text-sm">{patient ? new Date(patient.createdAt).toLocaleDateString('pt-BR') : '-'}</p>
                  </div>

                  {/* Financial Summary */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Total Gasto</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(totalSpent)}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">Progresso dos Procedimentos</span>
                        <span className="font-medium">
                          {procedures.length > 0 ? Math.round((completedProcedures.length / procedures.length) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${procedures.length > 0 ? (completedProcedures.length / procedures.length) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Procedimentos Ativos:</span>
                        <span className="font-medium ml-1">{activeProcedures.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Concluídos:</span>
                        <span className="font-medium ml-1">{completedProcedures.length}</span>
                      </div>
                    </div>
                  </div>

                  <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="w-full mt-4">
                        Desativar Paciente
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-red-600">Desativar Paciente</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          value={deactivateReason}
                          onChange={(e) => setDeactivateReason(e.target.value)}
                          placeholder="Explique o motivo da desativação..."
                          rows={4}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsDeactivateDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDeactivate}
                            disabled={!deactivateReason.trim() || deactivatePatientMutation.isPending}
                          >
                            {deactivatePatientMutation.isPending ? 'Desativando...' : 'Desativar'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* Active Procedures */}
              {activeProcedures.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Procedimentos Ativos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activeProcedures.map((procedure: any) => (
                        <div key={procedure.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div>
                            <p className="font-medium">{procedure.name}</p>
                            <p className="text-sm text-gray-600">
                              Válido até: {new Date(procedure.validUntil).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">{formatCurrency(parseFloat(procedure.value))}</p>
                            <Badge variant="outline" className="text-xs">Pendente</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Timeline */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Linha do Tempo - Prontuário</CardTitle>
                    <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Anotação
                          </Button>
                        </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Anotação</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Tipo de Anotação</Label>
                            <select
                              value={newNote.type}
                              onChange={(e) => setNewNote(prev => ({ ...prev, type: e.target.value as PatientNote['type'] }))}
                              className="w-full p-2 border rounded"
                            >
                              <option value="note">Anotação Geral</option>
                              <option value="procedure">Procedimento Fechado</option>
                              <option value="appointment">Consulta</option>
                              <option value="missed">Falta</option>
                              <option value="payment">Pagamento</option>
                            </select>
                          </div>

                          {newNote.type === 'procedure' && (
                            <>
                              <div>
                                <Label>Selecionar Procedimento</Label>
                                <select
                                  value={newNote.title || ""}
                                  onChange={(e) => {
                                    const selectedTemplate = procedureTemplates.find(t => t.name === e.target.value);
                                    setNewNote(prev => ({ 
                                      ...prev, 
                                      title: e.target.value,
                                      amount: selectedTemplate?.defaultPrice?.toString() || ""
                                    }));
                                  }}
                                  className="w-full p-2 border rounded"
                                >
                                  <option value="">Selecione um procedimento</option>
                                  {procedureTemplates.map((template: any) => (
                                    <option key={template.id} value={template.name}>
                                      {template.name} - {formatCurrency(parseFloat(template.defaultPrice || '0'))}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <Label>Valor</Label>
                                <Input
                                  value={newNote.amount || ""}
                                  onChange={(e) => setNewNote(prev => ({ ...prev, amount: e.target.value }))}
                                  placeholder="R$ 0,00"
                                  type="number"
                                  step="0.01"
                                />
                              </div>
                            </>
                          )}

                          {newNote.type === 'payment' && (
                            <>
                              <div>
                                <Label>Título do Pagamento</Label>
                                <Input
                                  value={newNote.title || ""}
                                  onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                                  placeholder="Descrição do pagamento..."
                                />
                              </div>
                              <div>
                                <Label>Valor</Label>
                                <Input
                                  value={newNote.amount || ""}
                                  onChange={(e) => setNewNote(prev => ({ ...prev, amount: e.target.value }))}
                                  placeholder="R$ 0,00"
                                  type="number"
                                  step="0.01"
                                />
                              </div>
                            </>
                          )}

                          <div>
                            <Label>Anotação</Label>
                            <Textarea
                              value={newNote.content}
                              onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                              placeholder="Descreva o que aconteceu..."
                              rows={4}
                            />
                          </div>

                          {/* Upload de Arquivos */}
                          <div>
                            <Label>Anexar Arquivos (PDF, Imagens)</Label>
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              multiple
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const formData = new FormData();
                                  formData.append('file', file);
                                  formData.append('title', `Arquivo: ${file.name}`);
                                  uploadFile.mutate(formData);
                                }
                              }}
                              className="mt-1"
                            />
                            {selectedFiles && selectedFiles.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-600">Arquivos selecionados:</p>
                                <ul className="text-sm text-gray-800">
                                  {Array.from(selectedFiles).map((file, index) => (
                                    <li key={index} className="flex items-center space-x-2">
                                      <FileText className="h-4 w-4" />
                                      <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              onClick={handleAddNote}
                              disabled={addNoteMutation.isPending || !newNote.content.trim()}
                            >
                              {addNoteMutation.isPending ? "Adicionando..." : "Adicionar Nota"}
                            </Button>

                            <label htmlFor="file-upload">
                              <Button variant="outline" type="button" asChild>
                                <span>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Adicionar Arquivo
                                </span>
                              </Button>
                            </label>
                            <input
                              id="file-upload"
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const formData = new FormData();
                                  formData.append('file', file);
                                  formData.append('title', `Arquivo: ${file.name}`);
                                  uploadFile.mutate(formData);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notes && notes.length > 0 ? (
                      notes.map((note: PatientNote) => (
                        <div key={note.id} className="flex gap-4 p-4 border rounded-lg">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                              {getTypeIcon(note.type)}
                            </div>
                            <div className="w-px h-full bg-gray-200 mt-2"></div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {note.title && <h4 className="font-medium">{note.title}</h4>}
                                {note.amount && (
                                  <Badge variant="outline" className="text-green-600">
                                    {formatCurrency(parseFloat(note.amount))}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(note.date).toLocaleString('pt-BR')}
                              </div>
                            </div>
                            <p className="text-gray-700">{note.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhuma anotação encontrada</p>
                        <p className="text-sm">Adicione a primeira anotação do prontuário</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}