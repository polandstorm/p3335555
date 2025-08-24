
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useDeleteCollaborator() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (collaboratorId: string) => {
      const response = await apiRequest("DELETE", `/api/collaborators/${collaboratorId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collaborators"] });
      toast({
        title: "Colaborador excluído",
        description: "Colaborador removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir colaborador",
        description: error.message || "Erro interno do servidor",
      });
    },
  });
}
