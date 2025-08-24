import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface CompleteConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  patientId: string;
  patientName: string;
}

export default function CompleteConsultationModal({
  isOpen,
  onClose,
  eventId,
  patientId,
  patientName,
}: CompleteConsultationModalProps) {
  const [completionType, setCompletionType] = useState<'closed_procedure' | 'no_closure' | 'missed' | ''>('');
  const [selectedProcedureId, setSelectedProcedureId] = useState('');
  const [notes, setNotes] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar templates de procedimentos disponíveis
  const { data: procedureTemplates = [] } = useQuery({
    queryKey: ['/api/procedure-templates'],
  });

  const completeConsultationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/events/${eventId}/complete`, data),
    onSuccess: () => {
      toast({
        title: "Consulta Finalizada",
        description: getSuccessMessage(),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procedures"] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao Finalizar Consulta",
        description: error.message || "Não foi possível finalizar a consulta",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setCompletionType('');
    setSelectedProcedureId('');
    setNotes('');
  };

  const getSuccessMessage = () => {
    switch (completionType) {
      case 'closed_procedure':
        return `Procedimento fechado para ${patientName}! Validade iniciada.`;
      case 'no_closure':
        return `${patientName} marcado como "não fechou procedimento".`;
      case 'missed':
        return `${patientName} marcado como "faltou na consulta".`;
      default:
        return "Consulta finalizada com sucesso.";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!completionType) {
      toast({
        title: "Seleção Obrigatória",
        description: "Por favor, informe o resultado da consulta",
        variant: "destructive",
      });
      return;
    }

    if (completionType === 'closed_procedure' && !selectedProcedureId) {
      toast({
        title: "Procedimento Obrigatório",
        description: "Selecione qual procedimento foi fechado",
        variant: "destructive",
      });
      return;
    }

    const payload: any = {
      completionType,
      notes,
    };

    if (completionType === 'closed_procedure') {
      payload.closedProcedureTemplateId = selectedProcedureId;
    }

    completeConsultationMutation.mutate(payload);
  };

  const getIcon = () => {
    switch (completionType) {
      case 'closed_procedure':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'no_closure':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'missed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (completionType) {
      case 'closed_procedure': return "border-green-200 bg-green-50";
      case 'no_closure': return "border-yellow-200 bg-yellow-50";
      case 'missed': return "border-red-200 bg-red-50";
      default: return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar Consulta - {patientName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Resultado da Consulta *</Label>
            <Select value={completionType} onValueChange={(value: any) => setCompletionType(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o resultado..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="closed_procedure">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Fechou Procedimento</span>
                  </div>
                </SelectItem>
                <SelectItem value="no_closure">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span>Não Fechou Nada</span>
                  </div>
                </SelectItem>
                <SelectItem value="missed">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>Faltou na Consulta</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Procedimento se fechou */}
          {completionType === 'closed_procedure' && (
            <div>
              <Label className="text-sm font-medium">Qual Procedimento Foi Fechado? *</Label>
              <Select value={selectedProcedureId} onValueChange={setSelectedProcedureId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o procedimento..." />
                </SelectTrigger>
                <SelectContent>
                  {procedureTemplates.map((template: any) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-gray-600">
                          R$ {parseFloat(template.approximateValue).toFixed(2)} • {template.validityDays} dias
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProcedureId && (
                <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                  💡 A validade do procedimento começará a contar a partir de hoje
                </div>
              )}
            </div>
          )}

          {/* Observações */}
          <div>
            <Label className="text-sm font-medium">Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre a consulta..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Preview do Status */}
          {completionType && (
            <div className={`p-3 rounded-lg border ${getStatusColor()}`}>
              <div className="flex items-center space-x-2 mb-2">
                {getIcon()}
                <span className="font-medium text-sm">Status que será aplicado:</span>
              </div>
              <p className="text-sm">
                {completionType === 'closed_procedure' && `${patientName} terá um novo procedimento ativo`}
                {completionType === 'no_closure' && `${patientName} será marcado como "não fechou procedimento"`}
                {completionType === 'missed' && `${patientName} será marcado como "desistente"`}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={completeConsultationMutation.isPending || !completionType}
            >
              {completeConsultationMutation.isPending ? "Finalizando..." : "Finalizar Consulta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}