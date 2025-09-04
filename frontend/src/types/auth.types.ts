export type Role = "ADMIN" | "RESPONSABLE";

export type AuthUser = {
  user_id: string;        // UUID
  full_name: string | null;
  email: string;
  role: Role;
};
