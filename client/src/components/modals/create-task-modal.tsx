import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorId: string;
  collaboratorName: string;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  collaboratorId,
  collaboratorName,
}: CreateTaskModalProps) {
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/tasks", data),
    onSuccess: () => {
      toast({
        title: "Tarefa Criada",
        description: `Tarefa atribuída para ${collaboratorName} com sucesso!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setTaskData({
        title: "",
        description: "",
        dueDate: "",
        priority: "medium",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao Criar Tarefa",
        description: error.message || "Não foi possível criar a tarefa",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskData.title || !taskData.description || !taskData.dueDate) {
      toast({
        title: "Campos Obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    createTaskMutation.mutate({
      title: taskData.title,
      description: taskData.description,
      assignedTo: collaboratorId,
      dueDate: taskData.dueDate,
      priority: taskData.priority,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50";
      case "medium": return "text-yellow-600 bg-yellow-50";
      case "low": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Tarefa para {collaboratorName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título da Tarefa *</Label>
            <Input
              id="title"
              value={taskData.title}
              onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
              placeholder="Ex: Revisar pacientes pendentes"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={taskData.description}
              onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
              placeholder="Descreva detalhadamente o que precisa ser feito..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate">Data de Vencimento *</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={taskData.dueDate}
                onChange={(e) => setTaskData({ ...taskData, dueDate: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={taskData.priority}
                onValueChange={(value: "low" | "medium" | "high") =>
                  setTaskData({ ...taskData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <span className={`px-2 py-1 rounded text-xs ${getPriorityColor("low")}`}>
                      Baixa
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className={`px-2 py-1 rounded text-xs ${getPriorityColor("medium")}`}>
                      Média
                    </span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className={`px-2 py-1 rounded text-xs ${getPriorityColor("high")}`}>
                      Alta
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview da Tarefa */}
          {taskData.title && taskData.description && taskData.dueDate && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-sm text-blue-900 mb-2">Preview da Tarefa:</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Título:</strong> {taskData.title}</p>
                <p><strong>Descrição:</strong> {taskData.description}</p>
                <p><strong>Vencimento:</strong> {formatDate(taskData.dueDate)}</p>
                <div className="flex items-center space-x-2">
                  <strong>Prioridade:</strong>
                  <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(taskData.priority)}`}>
                    {taskData.priority === "high" ? "Alta" : taskData.priority === "medium" ? "Média" : "Baixa"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createTaskMutation.isPending || !taskData.title || !taskData.description || !taskData.dueDate}
            >
              {createTaskMutation.isPending ? "Criando..." : "Criar Tarefa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}