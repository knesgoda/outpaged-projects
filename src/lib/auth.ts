export type Role = "admin" | "manager" | "member" | "viewer";

export type User = {
  id: string;
  email: string;
  role: Role;
};

const MOCK_USER: User = {
  id: "user-1",
  email: "casey.manager@example.com",
  role: "manager",
};

export function getCurrentUser(): User | null {
  // TODO: Replace with Supabase session lookup
  return MOCK_USER;
}
