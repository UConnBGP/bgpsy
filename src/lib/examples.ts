import type { Config } from './types';

export const exampleConfigs: Record<string, Config> = {
  'Subprefix Hijack': {
    name: 'Config 1',
    desc: 'BGP hidden hijack (with simple AS)',
    scenario: 'SubprefixHijack',
    announcements: [],
    attacker_asns: [666],
    victim_asns: [777],
    graph: {
      peer_links: [[2, 3]],
      cp_links: [
        [1, 2],
        [2, 777],
        [3, 666]
      ]
    }
  },
  'Subprefix Hijack with Custom Announcements': {
    name: 'Config 1',
    desc: 'Subprefix hijack with custom announcements',
    scenario: null,
    announcements: [
      {
        prefix: '1.2.0.0/16',
        as_path: [777],
        seed_asn: 777,
        roa_valid_length: true,
        roa_origin: 777
      },
      {
        prefix: '1.2.0.0/24',
        as_path: [666],
        seed_asn: 666,
        roa_valid_length: false,
        roa_origin: 777
      }
    ],
    attacker_asns: [666],
    victim_asns: [777],
    graph: {
      peer_links: [[2, 3]],
      cp_links: [
        [1, 2],
        [2, 777],
        [3, 666]
      ]
    }
  },
  'BGP Proagation': {
    name: 'Config 3',
    desc: 'Basic BGP propagation (with normal BGP AS)',
    scenario: 'ValidPrefix',
    announcements: [],
    victim_asns: [777],
    graph: {
      peer_links: [
        [2, 3],
        [777, 5]
      ],
      cp_links: [
        [1, 2],
        [2, 4],
        [2, 777],
        [3, 6]
      ]
    }
  },
  'Valley Free (Gao Rexford) with ROV': {
    name: 'Config 36',
    desc: 'Valley Free (Gao Rexford) demonstration',
    scenario: 'SubprefixHijack',
    announcements: [],
    attacker_asns: [666],
    victim_asns: [777],
    asn_policy_map: {
      '8': 'ROV'
    },
    graph: {
      cp_links: [
        [1, 666],
        [2, 666],
        [4, 777],
        [5, 1],
        [5, 2],
        [8, 4],
        [9, 777],
        [10, 5],
        [10, 8],
        [10, 9],
        [11, 9]
      ],
      peer_links: [
        [5, 8],
        [8, 9],
        [3, 8]
      ],
      propagation_ranks: [
        [666, 777],
        [1, 2, 3, 4],
        [5, 8, 9],
        [10, 11]
      ]
    }
  }
};
