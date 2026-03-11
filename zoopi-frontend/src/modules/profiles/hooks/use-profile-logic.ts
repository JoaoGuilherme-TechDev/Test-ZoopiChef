/* eslint-disable @typescript-eslint/no-explicit-any */
// ────────────────────────────────────────────────────────────────
// FILE: src/modules/profiles/hooks/use-profile-logic.ts
// ────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileService } from "@/services/profileService";
import { useAlert } from "@/modules/alerts";
import { suppressNextAlert } from "@/lib/api";
import api from "@/lib/api";

export const useProfileLogic = () => {
  const queryClient = useQueryClient();
  const alert = useAlert();

  // 1. Busca os dados do perfil
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: () => profileService.getMe(),
  });

  // 2. Atualizar Dados Gerais
  const updateProfileMutation = useMutation({
    mutationFn: (data: { full_name?: string; phone?: string }) =>
      profileService.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      alert.success("As alterações do seu perfil foram salvas!");
    },
  });

  // 3. Atualizar Senha
  // IMPORTANTE: suppressNextAlert() é chamado ANTES da requisição para evitar
  // que um 401 (senha atual errada) deslogue o usuário — tratamos manualmente.
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: {
      oldPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      suppressNextAlert(); // Bloqueia o interceptor para este request
      return api.patch("/profiles/me/password", data);
    },
    onSuccess: () => {
      alert.success("Sua senha foi alterada com sucesso!", {
        module: "Perfil",
      });
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const rawMsg = error?.response?.data?.message;

      // Extrai a mensagem legível (pode ser array ou string)
      const message = Array.isArray(rawMsg)
        ? rawMsg[0]
        : typeof rawMsg === "string"
        ? rawMsg
        : null;

      // 401 — senha atual errada (backend devolve 401 para credencial inválida)
      if (status === 401) {
        alert.error("A senha atual está incorreta. Tente novamente.", {
          module: "Perfil",
          targetTab: "security",
          fields: ["oldPassword"],
          routeLabel: "Corrigir Senha",
        });
        return;
      }

      // 400 — validação do backend (ex: "nova senha deve ter no mínimo 6 caracteres")
      if (status === 400) {
        // Tenta detectar qual campo o backend está reclamando
        const msgLower = message?.toLowerCase() ?? "";
        const isAboutNewPassword =
          msgLower.includes("nova senha") ||
          msgLower.includes("new password") ||
          msgLower.includes("mínimo") ||
          msgLower.includes("caracteres") ||
          msgLower.includes("senha deve");

        alert.error(message ?? "Verifique os campos de senha.", {
          module: "Perfil",
          targetTab: "security",
          fields: isAboutNewPassword
            ? ["newPassword", "confirmPassword"]
            : ["oldPassword"],
          routeLabel: "Corrigir Senha",
        });
        return;
      }

      // Fallback genérico
      alert.error(message ?? "Erro ao alterar senha. Tente novamente.", {
        module: "Perfil",
        targetTab: "security",
        fields: ["oldPassword", "newPassword", "confirmPassword"],
        routeLabel: "Corrigir Senha",
      });
    },
  });

  // 4. Atualizar E-mail
  const updateEmailMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      return api.patch("/profiles/me/email", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      alert.success("E-mail alterado com sucesso!", { module: "Perfil" });
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const rawMsg = error?.response?.data?.message;
      const message = Array.isArray(rawMsg)
        ? rawMsg[0]
        : typeof rawMsg === "string"
        ? rawMsg
        : null;

      if (status === 409) {
        alert.error("Este e-mail já está em uso por outra conta.", {
          module: "Perfil",
          targetTab: "account",
          fields: ["email"],
          routeLabel: "Corrigir E-mail",
        });
        return;
      }

      if (status === 400) {
        alert.error(message ?? "E-mail inválido. Verifique o formato.", {
          module: "Perfil",
          targetTab: "account",
          fields: ["email"],
          routeLabel: "Corrigir E-mail",
        });
        return;
      }

      alert.error(message ?? "Erro ao alterar e-mail. Tente novamente.", {
        module: "Perfil",
        targetTab: "account",
        fields: ["email"],
        routeLabel: "Corrigir E-mail",
      });
    },
  });

  // 5. Upload de Avatar
  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => profileService.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      alert.success("Foto de perfil atualizada!", { module: "Perfil" });
    },
  });

  return {
    profile,
    isLoading,
    updateProfile: updateProfileMutation.mutate,
    isUpdatingProfile: updateProfileMutation.isPending,
    updatePassword: updatePasswordMutation.mutate,
    isUpdatingPassword: updatePasswordMutation.isPending,
    updateEmail: updateEmailMutation.mutate,
    isUpdatingEmail: updateEmailMutation.isPending,
    uploadAvatar: uploadAvatarMutation.mutate,
    isUploadingAvatar: uploadAvatarMutation.isPending,
  };
};