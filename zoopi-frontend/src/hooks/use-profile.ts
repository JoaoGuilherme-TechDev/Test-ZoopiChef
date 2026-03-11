import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileService, UpdateProfileData } from "@/services/profileService";
import { toast } from "sonner";

export const useProfile = () => {
  const queryClient = useQueryClient();

  // 1. Hook para buscar os dados do perfil
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile-me"],
    queryFn: () => profileService.getMe(),
  });

  // 2. Hook para atualizar dados de texto (nome, telefone)
  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileData) => profileService.updateMe(data),
    onSuccess: () => {
      // Avisa ao TanStack Query que os dados antigos estão "sujos" e precisam ser recarregados
      queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar perfil. Tente novamente.");
    },
  });

  // 3. Hook para fazer o upload do Avatar
  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => profileService.uploadAvatar(file),
    onSuccess: (data) => {
      // Atualiza o cache local imediatamente com a nova URL da imagem
      queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      toast.success("Foto de perfil atualizada!");
    },
    onError: () => {
      toast.error("Erro ao enviar a imagem.");
    },
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    uploadAvatar: uploadAvatarMutation.mutate,
    isUploading: uploadAvatarMutation.isPending,
  };
};