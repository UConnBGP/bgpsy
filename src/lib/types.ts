export type Graph = {
  cp_links: number[][];
  peer_links: number[][];
};

export type Announcement = {
  prefix: string;
  as_path: number[];
  seed_asn: number;
  roa_valid_length: boolean;
  roa_origin: number;
};

export type Config = {
  name: string;
  desc: string;
  scenario: string | null;
  announcements: Announcement[];
  attacker_asns?: number[];
  victim_asns?: number[];
  asn_policy_map?: Record<number, string>;
  propagation_rounds: number;
  graph?: Graph;
};

export type AS = {
  asn: number;
  customers: AS[];
  providers: AS[];
  peers: AS[];
};
