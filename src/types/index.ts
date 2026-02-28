export type AppRole = "super_user" | "admin" | "user" | string;

export type AppPermission = {
  resource: string;
  action: string;
};

export type SessionPayload = {
  userId: string;
  email: string;
  roles: AppRole[];
};
