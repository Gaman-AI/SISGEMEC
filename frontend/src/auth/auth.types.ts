export type UserRole = "ADMIN" | "RESPONSABLE";
export type Profile = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  active: boolean;
};