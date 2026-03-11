import api from "@/lib/api";

export interface Profile {
  id: string;
  user_id: string;
  company_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  global_role?: string | null;
  user?: {
    email?: string | null;
  } | null;
  company?: {
    name?: string | null;
  } | null;
}

export interface UpdateProfileData {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

// Base do backend SEM o /api — usada para assets estáticos (uploads)
const BACKEND_BASE = "http://localhost:3000";

/**
 * Normaliza a URL do avatar para sempre ser absoluta.
 * O backend retorna paths relativos como /uploads/avatar.jpg
 * que precisam da base do servidor, não da base da API.
 */
function normalizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BACKEND_BASE}${url}`;
}

export const profileService = {
  getMe: async (): Promise<Profile> => {
    const { data } = await api.get<Profile>("/profiles/me");
    return {
      ...data,
      avatar_url: normalizeAvatarUrl(data.avatar_url),
    };
  },

  updateMe: async (data: UpdateProfileData): Promise<Profile> => {
    const { data: responseData } = await api.patch<Profile>("/profiles/me", data);
    return {
      ...responseData,
      avatar_url: normalizeAvatarUrl(responseData.avatar_url),
    };
  },

  uploadAvatar: async (file: File): Promise<{ avatar_url: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post<{ avatar_url: string }>(
      "/profiles/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return {
      avatar_url: normalizeAvatarUrl(data.avatar_url) ?? "",
    };
  },
};