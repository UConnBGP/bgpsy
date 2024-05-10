import type { Config } from './types';

export const exampleConfigsMap: Record<string, string> = {
  '#subprefix-hijack': 'Subprefix Hijack',
  '#subprefix-hijack-custom-anns': 'Subprefix Hijack with Custom Announcements',
  '#bgp-prop': 'BGP Propagation',
  '#valley-free': 'Valley Free (Gao Rexford) with ROV',
  '#accidental-route-leak': 'Accidental Route Leak with OTC',
  '#origin-prefix-hijack': 'Origin Prefix Hijack with Pathend',
  '#spea': 'Shortest Path Export All with ASPA',
  '#spea-partial': 'Shortest Path Export All with ASPA (Partial Adoption)'
};

export const exampleConfigs: Record<string, Config> = {
  'Subprefix Hijack': {
    name: 'Subprefix Hijack',
    desc: 'Subprefix hijack with normal ASes',
    scenario: 'SubprefixHijack',
    scenario_modifier: null,
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
    name: 'Subprefix Hijack',
    desc: 'Subprefix hijack with custom announcements',
    scenario: null,
    announcements: [
      {
        prefix: '1.2.0.0/16',
        as_path: [777],
        seed_asn: 777
      },
      {
        prefix: '1.2.0.0/24',
        as_path: [666],
        seed_asn: 666
      }
    ],
    roas: [
      {
        prefix: '1.2.0.0/16',
        origin: 777
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
  'BGP Propagation': {
    name: 'BGP Propagation',
    desc: 'Basic BGP propagation (with normal BGP AS)',
    scenario: 'ValidPrefix',
    scenario_modifier: null,
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
    name: 'Gao Rexford',
    desc: 'Valley Free (Gao Rexford) demonstration',
    scenario: 'SubprefixHijack',
    scenario_modifier: null,
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
  },
  'Accidental Route Leak with OTC': {
    name: 'Accidental Route Leak with OTC',
    desc: 'Accidental route leak against Only To Customers. This policy sets the only_to_customers attribute specified in RFC 9234, which protects against simple route leaks.',
    scenario: 'AccidentalRouteLeak',
    scenario_modifier: null,
    announcements: [],
    attacker_asns: [666],
    victim_asns: [777],
    asn_policy_map: {
      '1': 'otc',
      '2': 'otc'
    },
    propagation_rounds: 2,
    graph: {
      cp_links: [
        [1, 666],
        [2, 666],
        [2, 777],
        [4, 777],
        [5, 1],
        [8, 1],
        [8, 2],
        [9, 4],
        [10, 777],
        [11, 8],
        [11, 9],
        [11, 10],
        [12, 10]
      ],
      peer_links: [
        [8, 9],
        [9, 10],
        [3, 9]
      ],
      propagation_ranks: [
        [666, 777],
        [1, 2, 3, 4],
        [5, 8, 9, 10],
        [11, 12]
      ]
    }
  },
  'Origin Prefix Hijack with Pathend': {
    name: 'Origin Prefix Hijack with Pathend',
    desc: 'Origin prefix hijack with pathend simple.\nPathend checks the end of the path for valid providers\nand is thus protected against simple origin hijacks',
    scenario: 'PrefixHijack',
    scenario_modifier: 'origin_hijack',
    // base_policy: null,
    announcements: [],
    attacker_asns: [666],
    victim_asns: [777],
    asn_policy_map: {
      '1': 'pathend',
      '777': 'pathend'
    },
    graph: {
      cp_links: [
        [1, 666],
        [2, 666],
        [2, 777],
        [4, 777],
        [5, 1],
        [8, 1],
        [8, 2],
        [9, 4],
        [10, 777],
        [11, 8],
        [11, 9],
        [11, 10],
        [12, 10]
      ],
      peer_links: [
        [8, 9],
        [9, 10],
        [3, 9]
      ],
      propagation_ranks: [
        [666, 777],
        [1, 2, 3, 4],
        [5, 8, 9, 10],
        [11, 12]
      ]
    }
  },
  'Shortest Path Export All with ASPA (Partial Adoption)': {
    name: 'Shortest Path Export All with ASPA',
    desc: 'Shortest path export all against ASPA from a customer\nAS 5 fails to detect the shortest path export all',
    scenario: 'PrefixHijack',
    scenario_modifier: 'shortest_path_export_all_hijack',
    announcements: [],
    attacker_asns: [666],
    victim_asns: [777],
    asn_policy_map: {
      '2': 'aspa',
      '5': 'aspa',
      '10': 'aspa',
      '777': 'aspa'
    },
    propagation_rounds: 1,
    graph: {
      cp_links: [
        [1, 666],
        [2, 666],
        [2, 777],
        [4, 777],
        [5, 1],
        [8, 1],
        [8, 2],
        [9, 4],
        [10, 777],
        [11, 8],
        [11, 9],
        [11, 10],
        [12, 10]
      ],
      peer_links: [
        [8, 9],
        [9, 10],
        [3, 9]
      ],
      propagation_ranks: [
        [666, 777],
        [1, 2, 3, 4],
        [5, 8, 9, 10],
        [11, 12]
      ]
    }
  },
  'Shortest Path Export All with ASPA': {
    name: 'Shortest Path Export All with ASPA',
    desc: 'Shortest path export all against ASPA from a peer AS prevents the attack',
    scenario: 'PrefixHijack',
    scenario_modifier: 'shortest_path_export_all_hijack',
    // base_policy: null,
    // adopt_policy: 'aspa',
    announcements: [],
    attacker_asns: [666],
    victim_asns: [777],
    asn_policy_map: {
      '2': 'aspa',
      '4': 'aspa',
      '5': 'aspa',
      '8': 'aspa',
      '9': 'aspa',
      '10': 'aspa',
      '11': 'aspa',
      '12': 'aspa',
      '777': 'aspa'
    },
    propagation_rounds: 1,
    graph: {
      cp_links: [
        [1, 666],
        [2, 666],
        [2, 777],
        [4, 777],
        [5, 1],
        [8, 1],
        [8, 2],
        [9, 4],
        [10, 777],
        [11, 8],
        [11, 9],
        [11, 10],
        [12, 10]
      ],
      peer_links: [
        [8, 9],
        [9, 10],
        [3, 9]
      ],
      propagation_ranks: [
        [666, 777],
        [1, 2, 3, 4],
        [5, 8, 9, 10],
        [11, 12]
      ]
    }
  }
};
