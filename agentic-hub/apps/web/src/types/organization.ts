/**
 * Organization Types - Multi-tenant types
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export type OrganizationPlan = "starter" | "professional" | "enterprise";

export interface OrganizationSettings {
  branding?: {
    logo?: string;
    primaryColor?: string;
    accentColor?: string;
  };
  limits?: {
    maxAgents: number;
    maxConversationsPerMonth: number;
    maxStorageGB: number;
  };
  features?: {
    whatsappEnabled: boolean;
    apiAccessEnabled: boolean;
    customIntegrations: boolean;
  };
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: MemberRole;
  invitedAt?: Date;
  joinedAt: Date;
}

export type MemberRole = "owner" | "admin" | "member" | "viewer";

// Usage metrics
export interface OrganizationUsage {
  organizationId: string;
  period: string; // YYYY-MM
  conversations: number;
  messages: number;
  apiCalls: number;
  storageUsedMB: number;
  agentsActive: number;
}

