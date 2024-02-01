// place files you want to import through the `$lib` alias in this folder.

import type { Config } from './types';

export type * from './types';

export function getPropagationRanks(config: Config, cpLinks: number[][], peerLinks: number[][]) {
  const graph = config.graph;
  let asDict = new Map();

  // Initialize ASes and their relationships
  graph.cp_links.forEach((cp_link) => {
    let providerASN = cp_link[0];
    let customerASN = cp_link[1];

    if (!asDict.has(providerASN)) {
      asDict.set(providerASN, {
        providers: new Set(),
        customers: new Set(),
        propagationRank: null
      });
    }
    if (!asDict.has(customerASN)) {
      asDict.set(customerASN, {
        providers: new Set(),
        customers: new Set(),
        propagationRank: null
      });
    }

    asDict.get(providerASN).customers.add(customerASN);
    asDict.get(customerASN).providers.add(providerASN);
  });

  graph.peer_links.forEach((peer_link) => {
    let asn1 = peer_link[0];
    let asn2 = peer_link[1];

    if (!asDict.has(asn1)) {
      asDict.set(asn1, { providers: new Set(), customers: new Set(), propagationRank: null });
    }
    if (!asDict.has(asn2)) {
      asDict.set(asn2, { providers: new Set(), customers: new Set(), propagationRank: null });
    }
  });

  // Assign propagation ranks
  let maxRank = 0;
  function assignRanks(asn, rank) {
    let asInfo = asDict.get(asn);
    if (asInfo.propagationRank === null || asInfo.propagationRank < rank) {
      asInfo.propagationRank = rank;
      asInfo.providers.forEach((providerASN) => {
        assignRanks(providerASN, rank + 1);
      });
      maxRank = Math.max(maxRank, rank);
    }
  }

  asDict.forEach((asInfo, asn) => {
    if (asInfo.customers.size === 0) {
      // Leaf ASes have no customers
      assignRanks(asn, 0);
    }
  });

  // Extract propagation ranks into an object
  let propagationRanks = {};
  asDict.forEach((asInfo, asn) => {
    // propagationRanks[asn] = asInfo.propagationRank + 1;
    propagationRanks[asn] = maxRank + 1 - asInfo.propagationRank;
  });

  // console.log(propagationRanks);
  return propagationRanks;
}
