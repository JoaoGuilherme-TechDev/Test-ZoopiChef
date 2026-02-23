export interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  company_id?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
}

export interface Session {
  access_token: string;
  user: User;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}
