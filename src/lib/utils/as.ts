import type { DataSet, Edge, Node } from 'vis-network/standalone';
import type { Config } from '../types';
import { getPropagationRanks } from '../utils';

export function createNode(asn: number, level: number): Node {
  return {
    id: asn,
    label: String(asn),
    level: level
  };
}

// Get all remaining nodes except index and those in array
export function availableNodes(
  nodes: DataSet<Node>,
  array: Array<number | null>,
  index: number,
  asnToIgnore: number | null = null
) {
  const avail = nodes.get().filter((node: Node) => {
    return (
      (!array.includes(node.id as number) || array[index] === node.id) && node.id !== asnToIgnore
    );
  });

  return avail;
}

export function availableASNs(
  nodes: DataSet<Node>,
  array: Array<number | null>,
  index: number,
  asnToIgnore: number | null = null
): number[] {
  const avail = availableNodes(nodes, array, index, asnToIgnore)
    .map((node) => node.id as number)
    .sort((a: number, b: number) => a - b);
  return avail;
}

export function availableNodes2(nodes: DataSet<Node>): number[] {
  return nodes
    .get()
    .map((node) => node.id as number)
    .sort((a, b) => a - b);
}

export function getAllASes(nodes: DataSet<Node>): number[] {
  return nodes
    .get()
    .map((node) => Number(node.id))
    .sort((a, b) => a - b);
}

export function getASRole(asn: number, config: Config): string {
  if (config.victim_asns.includes(asn)) {
    return 'victim';
  } else if (config.attacker_asns.includes(asn)) {
    return 'attacker';
  } else {
    return 'none';
  }
}

export function getASPolicy(asn: number, config: Config): string {
  return config.asn_policy_map[asn] ?? 'bgp';
}

export function getASLevel(node: Node, config: Config): number | null {
  const asn = Number(node.id);
  // return node.level ?? getPropagationRanks(config.graph)[asn];

  // console.log(config.graph.node_level_map[asn]);
  if (config.graph.node_level_map && asn in config.graph.node_level_map) {
    return config.graph.node_level_map[asn];
  }

  return null;
}

export function getASProviders(asn: number, config: Config): number[] {
  return config.graph.cp_links
    .filter((link) => link[1] === asn)
    .map((link) => link[0])
    .sort((a, b) => a - b);
}

export function getASCustomers(asn: number, config: Config): number[] {
  return config.graph.cp_links
    .filter((link) => link[0] === asn)
    .map((link) => link[1])
    .sort((a, b) => a - b);
}

export function getASPeers(asn: number, config: Config): number[] {
  return config.graph.peer_links
    .filter((link) => link[0] === asn || link[1] === asn)
    .map((link) => (link[0] === asn ? link[1] : link[0]))
    .sort((a, b) => a - b);
}

export function getCurrentVictim(config: Config): number | null {
  if (config.victim_asns.length > 0) {
    return config.victim_asns[0];
  }

  return null;
}

export function updatePropRanks(nodes: DataSet<Node>, config: Config) {
  // Adjust height of graph
  const levels = getPropagationRanks(config.graph);
  nodes.forEach((node) => {
    nodes.update({ ...node, level: levels[node.id as number] || 1 });
  });
}

export function removeASRole(asn: number, config: Config) {
  const currentRole = getASRole(asn, config);

  if (currentRole === 'victim') {
    config.victim_asns = config.victim_asns.filter((victim) => victim !== asn);
  } else if (currentRole === 'attacker') {
    config.attacker_asns = config.attacker_asns.filter((victim) => victim !== asn);
  }
}

export function changeASN(
  oldASN: number,
  newASN: number,
  nodes: DataSet<Node>,
  edges: DataSet<Edge>,
  config: Config
) {
  // Update the node's ID and label
  const nodeToUpdate = nodes.get(oldASN);
  if (nodeToUpdate === null) {
    return;
  }

  nodes.remove(nodeToUpdate);
  nodes.add({ ...nodeToUpdate, id: Number(newASN), label: String(newASN) });

  // Update all edges connected to this node
  edges.forEach((edge) => {
    if (edge.from === oldASN) {
      edges.update({ ...edge, from: newASN });
    }
    if (edge.to === oldASN) {
      edges.update({ ...edge, to: newASN });
    }
  });

  // Update role arrays
  if (config.victim_asns.includes(oldASN)) {
    config.victim_asns = config.victim_asns.map((asn) => (asn === oldASN ? newASN : asn));
  } else if (config.attacker_asns.includes(oldASN)) {
    config.attacker_asns = config.attacker_asns.map((asn) => (asn === oldASN ? newASN : asn));
  }

  // Update policy map
  if (oldASN in config.asn_policy_map) {
    const policy = config.asn_policy_map[oldASN];
    delete config.asn_policy_map[oldASN];
    config.asn_policy_map[newASN] = policy;
  }

  // Update cpLinks and peerLinks if necessary
  config.graph.cp_links = config.graph.cp_links.map((link) =>
    link.map((id) => (id === oldASN ? newASN : id))
  );
  config.graph.peer_links = config.graph.peer_links.map((link) =>
    link.map((id) => (id === oldASN ? newASN : id))
  );

  // Update level map
  if (config.graph.node_level_map && oldASN in config.graph.node_level_map) {
    const level = config.graph.node_level_map[oldASN];
    delete config.graph.node_level_map[oldASN];
    config.graph.node_level_map[newASN] = level;
  }

  // Adjust height of graph
  updatePropRanks(nodes, config);
}

export function removeAS(asn: number, nodes: DataSet<Node>, edges: DataSet<Edge>, config: Config) {
  // Get all connected edges to the node
  const connectedEdges = edges.get({
    filter: function (item) {
      return item.from === asn || item.to === asn;
    }
  });

  // Remove all connected edges from the network
  edges.remove(connectedEdges.map((edge) => edge.id));
  config.graph.cp_links = config.graph.cp_links.filter(
    (link) => link[0] !== asn && link[1] !== asn
  );
  config.graph.peer_links = config.graph.peer_links.filter(
    (link) => link[0] !== asn && link[1] !== asn
  );

  // Remove the node
  nodes.remove(asn);

  // Remove from role arrays
  if (config.victim_asns.includes(asn)) {
    config.victim_asns = config.victim_asns.filter((victim) => victim !== asn);
  } else if (config.attacker_asns.includes(asn)) {
    config.attacker_asns = config.attacker_asns.filter((attacker) => attacker !== asn);
  }

  // Remove from policy map
  if (asn in config.asn_policy_map) {
    delete config.asn_policy_map[asn];
  }

  // Remove node from level map
  if (config.graph.node_level_map) {
    delete config.graph.node_level_map[asn];
  }

  // Adjust height of graph
  updatePropRanks(nodes, config);

  // Remove role
  removeASRole(asn, config);
}
