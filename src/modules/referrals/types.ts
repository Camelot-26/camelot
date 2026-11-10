export type ReferralStatus = "new" | "contacted" | "converted" | "closed";

export type Referral = {
  id: string;
  agentId: string;
  guestName: string;
  status: ReferralStatus;
  createdAt: Date;
};
