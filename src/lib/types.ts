export type Graph = {
  cp_links: number[][];
  peer_links: number[][];
  propagation_ranks?: number[][];
};

export type Announcement = {
  prefix: string;
  as_path: number[];
  seed_asn: number | null;
};

export type ROA = {
  prefix: string;
  origin: number | null;
  max_length?: number | null;
};

export type Config = {
  name: string;
  desc: string;
  scenario: string | null;
  scenario_modifier?: string | null;
  announcements?: Announcement[];
  roas?: ROA[]; // ?
  attacker_asns: number[]; // ?
  victim_asns: number[]; // ?
  asn_policy_map: Record<number, string>;
  propagation_rounds?: number;
  graph: Graph; // ?
};

export type LocalRIB = {
  type: string;
  mask: string;
  as_path: number[];
};

export type SimulationResults = {
  outcome: Record<number, number>;
  local_ribs: Record<number, LocalRIB[]>;
};

export type AnnouncementValidition = {
  prefix: string;
  origin: number;
  roas: ROA[];
};

export enum LinkType {
  CustomerProvider = 'customer-provider',
  PeerToPeer = 'peer'
}

export enum ASRole {
  Victim = 'victim',
  Attacker = 'attacker',
  None = ''
}

export enum ASPolicy {
  BGP = '',
  ROV = 'rov',
  ASPA = 'aspa',
  BGPSec = 'bgpsec',
  OTC = 'otc',
  Pathend = 'pathend'
}
