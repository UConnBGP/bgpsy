import type { Color } from 'vis-network/standalone';

export type Graph = {
  cp_links: number[][];
  peer_links: number[][];
  // propagation_ranks?: number[][];
  node_level_map?: Record<number, number>;
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

export type SimResults = {
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
  BGP = 'bgp',
  ROV = 'rov',
  ASPA = 'aspa',
  BGPSec = 'bgpsec',
  OTC = 'otc',
  PathEnd = 'path-end'
}

export enum ASRelationship {
  Customer = 'customer',
  Provider = 'provider',
  Peer = 'peer'
}

// export const scenarios = {
//   SubprefixHijack: 'Subprefix Hijack'
//   PrefixHijack:
// };

// export const scenarios = [
//   { value: 'CustomScenario', label: 'Custom Scenario' },
//   { value: 'SubprefixHijack', label: 'Subprefix Hijack' },
//   { value: 'PrefixHijack', label: 'Prefix Hijack' },
//   { value: 'ValidPrefix', label: 'Valid Prefix' },
//   { value: 'SuperprefixPrefixHijack', label: 'Superprefix Prefix Hijack' },
//   { value: 'NonRoutedPrefixHijack', label: 'Non-Routed Prefix Hijack' },
//   { value: 'NonRoutedSuperprefixHijack', label: 'Non-Routed Superprefix Hijack' },
//   { value: 'NonRoutedSuperprefixPrefixHijack', label: 'Non-Routed Superprefix Prefix Hijack' },
//   { value: 'AccidentalRouteLeak', label: 'Accidental Route Leak' }
// ];

export const scenarios: Record<string, string> = {
  customscenario: 'Custom Scenario',
  subprefixhijack: 'Subprefix Hijack',
  prefixhijack: 'Prefix Hijack',
  validprefix: 'Valid Prefix',
  accidentalrouteleak: 'Accidental Route Leak',
  superprefixprefixhijack: 'Superprefix Prefix Hijack',
  nonroutedprefixhijack: 'Non-Routed Prefix Hijack',
  nonroutedsuperprefixhijack: 'Non-Routed Superprefix Hijack',
  nonroutedsuperprefixprefixhijack: 'Non-Routed Superprefix Prefix Hijack'
};

export const scenarioModifiers: Record<string, string> = {
  origin_hijack: 'Origin Hijack',
  shortest_path_export_all_hijack: 'Shortest Path Export All'
};

export const policies: Record<string, string> = {
  bgp: 'BGP',
  rov: 'ROV',
  aspa: 'ASPA',
  otc: 'Only to Customers',
  'path-end': 'Path-End',
  bgpsec: 'BGPSec',
  'aspa+rov': 'ASPA with ROV (Experimental)'
};

export const roles: Record<string, string> = {
  none: 'None',
  attacker: 'Attacker',
  victim: 'Victim'
};

export const attackerColor: Color = {
  border: '#b91c1c',
  background: '#f87171',
  highlight: { border: '#b91c1c', background: '#fca5a5' },
  hover: { border: '#b91c1c', background: '#fca5a5' }
};

export const attackerSuccessColor: Color = {
  border: '#ea580c',
  background: '#f59e0b',
  highlight: { border: '#ea580c', background: '#fbbf24' },
  hover: { border: '#ea580c', background: '#fbbf24' }
};

export const victimColor: Color = {
  border: '#047857',
  background: '#34d399',
  highlight: { border: '#047857', background: '#6ee7b7' },
  hover: { border: '#047857', background: '#6ee7b7' }
};

export const victimSuccessColor: Color = {
  border: '#16a34a',
  background: '#86efac',
  highlight: { border: '#16a34a', background: '#bbf7d0' },
  hover: { border: '#16a34a', background: '#bbf7d0' }
};

export const disconnectedColor: Color = {
  border: '#737373',
  background: '#d4d4d4',
  highlight: { border: '#737373', background: '#e5e5e5' },
  hover: { border: '#737373', background: '#e5e5e5' }
};
