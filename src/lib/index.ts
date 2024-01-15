// place files you want to import through the `$lib` alias in this folder.
export type Graph = {
  cp_links: Array<Array<number>>;
  peer_links: Array<Array<number>>;
};

export type Announcement = {
  prefix: string;
  as_path: Array<number>;
  timestamp: number;
  seed_asn: number;
  roa_valid_length: boolean;
  roa_origin: number;
};

export type Config = {
  name: string;
  desc: string;
  scenario: string | null;
  announcements: Array<Announcement>;
  attacker_asns?: Array<number>;
  victim_asns?: Array<number>;
  asn_policy_map?: Record<number, string>;
  propagation_rounds: number;
  graph?: Graph;
};
