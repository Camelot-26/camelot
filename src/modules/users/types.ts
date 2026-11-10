import type { UserRole } from "@/types";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  role: UserRole;
  createdAt: Date;
};
