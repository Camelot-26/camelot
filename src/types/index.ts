export type UserRole = "admin" | "agent" | "customer";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  role: UserRole;
};
