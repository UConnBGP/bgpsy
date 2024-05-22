import type { Config } from '$lib/types';
import type { DataSet, Edge, Node } from 'vis-network/standalone';
import { updatePropRanks } from './as';

export function createCPEdge(from: number, to: number): Edge {
  return {
    from: from,
    to: to,
    arrows: {
      to: {
        enabled: true,
        scaleFactor: 0.8
      }
    }
  };
}

export function createPeerEdge(from: number, to: number): Edge {
  return {
    from: from,
    to: to,
    dashes: true,
    arrows: 'to, from'
  };
}

export function getEdgeByFromTo(from: number, to: number, edges: DataSet<Edge>): Edge | null {
  let matchingEdges = edges.get({
    filter: (edge) => {
      return edge.from === from && edge.to === to;
    }
  });

  // Return the first matching edge
  if (matchingEdges.length > 0) {
    return matchingEdges[0];
  }

  return null;
}

export function isPeerLink(link: Edge, edges: DataSet<Edge>, config: Config): boolean {
  // @ts-ignore
  // return link.dashes;
  for (const [to, from] of config.graph.peer_links) {
    if ((from === link.from && to === link.to) || (from === link.to && to === link.from)) {
      return true;
    }
  }
  return false;
}

export function swapLinkType(
  link: Edge,
  nodes: DataSet<Node>,
  edges: DataSet<Edge>,
  config: Config
) {
  const toASN = Number(link.to);
  const fromASN = Number(link.from);

  // Swap edge in peer/cp links array
  if (isPeerLink(link, edges, config)) {
    config.graph.peer_links = config.graph.peer_links.filter(
      (peerLink) =>
        !(peerLink[0] === fromASN && peerLink[1] === toASN) &&
        !(peerLink[0] === toASN && peerLink[1] === fromASN)
    );
    config.graph.cp_links = [...config.graph.cp_links, [fromASN, toASN]];
  } else {
    config.graph.cp_links = config.graph.cp_links.filter(
      (link) => link[0] !== fromASN || link[1] !== toASN
    );
    config.graph.peer_links = [...config.graph.peer_links, [fromASN, toASN]];
  }

  // Update graph to either have dashes or not
  link.dashes = !link.dashes;
  edges.update({ ...link });

  // Adjust height of graph
  updatePropRanks(nodes, config);
}

export function swapCustomerProvider(
  link: Edge,
  nodes: DataSet<Node>,
  edges: DataSet<Edge>,
  config: Config
) {
  const toASN = Number(link.to);
  const fromASN = Number(link.from);

  // Find link in cp links array and swap to and from
  const linkIndex = config.graph.cp_links.findIndex(
    (link) => link[0] === fromASN && link[1] === toASN
  );
  if (linkIndex !== -1) {
    config.graph.cp_links[linkIndex] = [toASN, fromASN];
  }

  // Swap in graph
  link.to = fromASN;
  link.from = toASN;
  edges.update({ ...link });

  // Adjust height of graph
  updatePropRanks(nodes, config);
}

// Find edge based on from and to values and remove it if it exists
export function removeLinkFromGraph(from: number, to: number, edges: DataSet<Edge>) {
  const edge = getEdgeByFromTo(from, to, edges);
  if (edge === null) {
    return;
  }
  edges.remove(edge);
}

// Remove link from graph and config
export function removeLink(link: Edge, nodes: DataSet<Node>, edges: DataSet<Edge>, config: Config) {
  if (!link.id) {
    return;
  }

  // Remove edge from peer/cp links array
  if (isPeerLink(link, edges, config)) {
    config.graph.peer_links = config.graph.peer_links.filter(
      (peerLink) =>
        !(peerLink[0] === link.from && peerLink[1] === link.to) &&
        !(peerLink[0] === link.to && peerLink[1] === link.from)
    );
  } else {
    config.graph.cp_links = config.graph.cp_links.filter(
      (cpLink) => cpLink[0] !== link.from || cpLink[1] !== link.to
    );
  }

  // Remove from graph
  edges.remove(link);

  // Adjust height of graph
  updatePropRanks(nodes, config);
}
