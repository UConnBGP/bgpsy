export type Graph = {
  cp_links: number[][];
  peer_links: number[][];
  propagation_ranks?: number[][];
};

export type Announcement = {
  prefix: string;
  as_path: number[];
  seed_asn: number;
  // roa_valid_length: boolean;
  // roa_origin: number;
};

export type ROA = {
  prefix: string;
  origin: number;
  max_length?: number | null;
};

export type Config = {
  name: string;
  desc: string;
  scenario: string | null;
  scenario_modifier?: string | null;
  announcements: Announcement[];
  roas?: ROA[];
  attacker_asns?: number[];
  victim_asns?: number[];
  asn_policy_map?: Record<number, string>;
  propagation_rounds?: number;
  graph?: Graph;
};

export type AnnouncementValidition = {
  prefix: string;
  origin: number;
  roas: ROA[];
};
