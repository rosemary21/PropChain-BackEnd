export enum PredefinedRole {
  ADMIN = 'admin',
  AGENT = 'agent',
  SELLER = 'seller',
  BUYER = 'buyer',
  VIEWER = 'viewer',
}

export const ROLE_HIERARCHY: Record<PredefinedRole, number> = {
  [PredefinedRole.ADMIN]: 100,
  [PredefinedRole.AGENT]: 50,
  [PredefinedRole.SELLER]: 30,
  [PredefinedRole.BUYER]: 20,
  [PredefinedRole.VIEWER]: 10,
};
