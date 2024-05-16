<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Network, DataSet, type Options, type Node, type Edge } from 'vis-network/standalone';
  import Ban from 'lucide-svelte/icons/ban';
  import { getPropagationRanks } from '$lib';
  import { type Config, type SimulationResults as SimResults } from '$lib/types';
  import { Label } from './ui/label';
  import Button from './ui/button/button.svelte';
  import * as Popover from './ui/popover';
  import Info from 'lucide-svelte/icons/info';
  import * as Card from '$lib/components/ui/card';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import {
    ArrowLeftRight,
    Fullscreen,
    Pencil,
    Plus,
    Trash2,
    X,
    ZoomIn,
    ZoomOut
  } from 'lucide-svelte';
  import { countByValue, flyAndScale } from '$lib/utils';
  import {
    drawLocalRIB,
    drawShape,
    drawText,
    getASPolicyName,
    getLocalRIBData,
    getMaxWidths,
    getNodeRadius
  } from '$lib/drawing';
  import AddASModal from './add-as-modal.svelte';
  import ClearGraphModal from './clear-graph-modal.svelte';
  import AddLinkModal from './add-link-modal.svelte';
  import RenameASModal from './rename-as-modal.svelte';

  // Props
  export let nodes: DataSet<Node>;
  export let edges: DataSet<Edge>;
  export let config: Config;
  export let simResults: SimResults | null;
  export let cpLinks: number[][];
  export let peerLinks: number[][];
  export let policyMap: Record<number, string>;
  export let roleMap: Record<number, string>;
  export let imageURL: string;
  export let graphLoadingState: string;

  // Vis-network
  let container: HTMLDivElement;
  let network: Network;
  let options: Options = {
    // Configuration for vis-network
    nodes: {
      shape: 'custom',
      borderWidth: 2,
      // @ts-ignore ctxRenderer does not have types in vis-network
      ctxRenderer: ({ ctx, id, x, y, state: { selected, hover }, style, label }) => {
        ctx.save();

        // Get local RIB data
        const rows = getLocalRIBData(simResults, id);

        // Font for the Local RIB
        const fontSize = 14;
        ctx.font = `${fontSize}px Inter`;

        // Find the max width for each column in local RIB table
        const maxWidths = getMaxWidths(ctx, rows);

        // Calculate dimensions of Local RIB table
        const cellHeight = fontSize + 10;
        const tableWidth = maxWidths.reduce((sum, a) => sum + a, 0);
        const tableHeight = cellHeight * (rows.length + 1);

        // Get formatted AS policy name
        const nodePolicy = getASPolicyName(config.asn_policy_map, id);

        // Adjust radius based on policy name length if simulation results are empty
        const r = getNodeRadius(ctx, tableWidth, nodePolicy, rows);

        // Style for shape
        ctx.fillStyle = style.color;
        ctx.strokeStyle = style.borderColor;
        ctx.lineWidth = selected || hover ? 3 : 2;

        // Draw it
        drawShape(ctx, nodePolicy, x, y, r);

        // Put the ASN and policy in the middle of the node
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Calculate the total height for centering
        const totalHeight = (rows.length > 0 ? tableHeight : 0) + 2 * fontSize + 20;

        // Draw it
        drawText(ctx, label, nodePolicy, totalHeight, fontSize, x, y);

        // Draw Local RIB
        drawLocalRIB(ctx, rows, tableWidth, tableHeight, maxWidths, cellHeight, x, y);

        ctx.restore();

        return {
          drawNode: null,
          nodeDimensions: { width: r * 2, height: r * 2 }
        };
      }
    },
    layout: {
      hierarchical: {
        enabled: true,
        levelSeparation: 200,
        nodeSpacing: 200,
        sortMethod: 'directed'
      }
    },
    edges: {
      width: 2
    },
    interaction: { hover: true, zoomSpeed: 0.7, zoomView: false },
    physics: false
  };

  // State variables for selection
  let selectedAS: Node | null = null;
  let selectedASN: number | null = null;
  let selectedASLevel: number | null = null;
  let selectedASRole: string | null = null;
  let selectedASPolicy: string | null = null;
  let selectedASRelationships = {
    customers: Array<number | null>(),
    providers: Array<number | null>(),
    peers: Array<number | null>()
  };
  let selectedLink: Edge | null = null;
  let selectedLinkID: string | null = null;
  let selectedASN2: any | null = null;
  let selectedLinkID2: string | null = null;

  let showAddASModal = false;
  let showClearGraphModal = false;
  let showAddEdgeModal = false;
  let showRenameASModal = false;
  let showLegend = false;
  let nodeData: {} | null = null;
  let edgeData: {} | null = null;
  let contextMenuData = { show: false, x: 0, y: 0 };
  let victimASN: any | null = null;
  let newLinkType: string | null = null;
  let addingEdge = false;
  let addingCPLink = false;
  let addingPeerLink = false;
  let canvas: HTMLCanvasElement;

  onMount(() => {
    // Initialize network
    network = new Network(container, { nodes, edges }, options);
    network.disableEditMode();

    container.addEventListener('wheel', handleWheel, { passive: false });

    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        selectedLinkID = null;
        selectedLink = null;
        selectedASN = params.nodes[0];
        // @ts-ignore
        selectedAS = nodes.get(selectedASN);
        selectedASLevel = selectedAS.level ?? null;
        selectedASRole = selectedAS.role ?? ''; // Get the role of the selected node
        selectedASPolicy = selectedAS.policy ?? 'bgp';
        selectedASRelationships = getRelationships(selectedASN as number);
        // console.log('selected AS: ' + selectedAS);
      } else if (params.edges.length > 0) {
        selectedASN = null;
        selectedAS = null;
        selectedASLevel = null;
        selectedLinkID = params.edges[0];
        // @ts-ignore
        selectedLink = edges.get(selectedLinkID);
      }

      contextMenuData.show = false;
    });

    network.on('deselectNode', () => {
      selectedASN = null;
      selectedAS = null;
      selectedASLevel = null;
      contextMenuData.show = false;
    });

    network.on('deselectEdge', () => {
      selectedLinkID = null;
    });

    // Right click
    network.on('oncontext', function (params) {
      // params.event.preventDefault();
      let show = false;

      if (nodeData !== null) {
        selectedASN2 = nodeData.id;
        selectedLinkID2 = null;
        show = true;
        params.event.preventDefault();
        nodeData = null;
      } else if (edgeData !== null) {
        // selectedLinkID = edgeData.id;
        selectedLinkID2 = edgeData.id;
        selectedASN2 = null;
        show = true;
        params.event.preventDefault();
      } else {
        selectedASN2 = null;
        selectedLinkID2 = null;
        show = true;
        params.event.preventDefault();
      }
      contextMenuData = {
        show: show,
        x: params.event.pageX,
        y: params.event.pageY
      };
    });

    // Show Local RIB on hover
    network.on('hoverNode', (params) => {
      if (addingEdge) {
        return;
      }
      const node = nodes.get(params.node);
      if (node !== null) {
        nodeData = {
          id: node.id,
          policy: node.policy || 'BGP',
          x: params.event.pageX,
          y: params.event.pageY
        };
      }
      // console.log(nodeData);
    });

    network.on('blurNode', (params) => {
      nodeData = null;
    });

    network.on('hoverEdge', (params) => {
      const edge = edges.get(params.edge);
      // console.log('edge found', edge);
      edgeData = {
        id: edge.id,
        x: params.event.pageX,
        y: params.event.pageY
      };
    });

    network.on('blurEdge', (params) => {
      edgeData = null;
    });

    // TODO: MOVE SOMEWHRE ELSE
    // Find victim when first initialized
    const victims = Object.entries(roleMap)
      .filter(([_, value]) => value === 'victim')
      .map(([key, _]) => key);
    if (victims.length > 0) {
      victimASN = Number(victims[0]);
    }
  });

  onDestroy(() => {
    if (network) {
      network.destroy();
    }
  });

  $: if (selectedAS && selectedASLevel !== selectedAS.level) {
    selectedAS = { ...selectedAS, level: selectedASLevel };
    nodes.update(selectedAS);
  }

  $: if (simResults && network) {
    showLegend = true;

    // Calculate radius for each node
    // Seems a bit inaccurate, but it works
    const radii = nodes.map((node, id) => {
      const ctx = canvas.getContext('2d')!;
      const asn = id as number;
      const rows = getLocalRIBData(simResults, asn);
      const policy = getASPolicyName(policyMap, asn);
      const maxWidths = getMaxWidths(ctx, rows);
      const tableWidth = maxWidths.reduce((sum, a) => sum + a, 0);
      return getNodeRadius(ctx, tableWidth, policy, rows);
    });
    const maxRadius = Math.max(...radii);
    // console.log(maxRadius);
    network.setOptions({
      ...options,
      layout: {
        hierarchical: {
          enabled: true,
          levelSeparation: maxRadius * 3.33,
          nodeSpacing: maxRadius * 3.33,
          sortMethod: 'directed'
        }
      }
    });

    network.fit({ animation: { duration: 200, easingFunction: 'linear' } });
    selectedASN = null;
    selectedLinkID = null;
  }

  $: if ((graphLoadingState === 'file' || graphLoadingState === 'example') && network) {
    network.fit({ animation: { duration: 200, easingFunction: 'linear' } });
    graphLoadingState = '';
    selectedASN = null;
    selectedLinkID = null;
  }

  function handleWheel(event: WheelEvent) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const direction = event.deltaY > 0 ? 1 / 1.1 : 1.1;
      const newScale = network.getScale() * direction;
      network.moveTo({
        scale: newScale,
        animation: { duration: 50, easingFunction: 'linear' }
      });
    }
  }

  export function addCPLink() {
    if (!addingCPLink) {
      network.addEdgeMode();
      newLinkType = 'customer-provider';
      addingEdge = true;
    } else {
      network.disableEditMode();
      addingEdge = false;
    }

    addingCPLink = !addingCPLink;
    addingPeerLink = false;
  }

  export function addPeerLink() {
    if (!addingPeerLink) {
      network.addEdgeMode();
      newLinkType = 'peer';
      addingEdge = true;
    } else {
      network.disableEditMode();
      addingEdge = false;
    }

    addingPeerLink = !addingPeerLink;
    addingCPLink = false;
  }

  function deleteNode() {
    if (selectedASN === null) {
      return;
    }

    // Log before
    // console.log('before delete node', edges, cpLinks, peerLinks);

    // Get all connected edges to the node
    const connectedEdges = edges.get({
      filter: function (item) {
        return item.from === selectedASN || item.to === selectedASN;
      }
    });

    // Remove all connected edges from the network
    edges.remove(connectedEdges.map((edge) => edge.id));
    cpLinks = cpLinks.filter((link) => link[0] !== selectedASN && link[1] !== selectedASN);
    peerLinks = peerLinks.filter((link) => link[0] !== selectedASN && link[1] !== selectedASN);

    // Remove the node
    nodes.remove(selectedASN);

    // Log to check
    // console.log('after delete node', edges, cpLinks, peerLinks);

    // Adjust height of graph
    const levels = getPropagationRanks({ cp_links: cpLinks, peer_links: peerLinks });
    nodes.forEach((node) => {
      nodes.update({ ...node, level: levels[node.id] || 1 });
    });

    selectedASN = null;
    selectedAS = null;
    selectedASLevel = null;
  }

  function deleteEdge() {
    if (selectedLinkID !== null) {
      const edge = edges.get(selectedLinkID);
      if (edge.dashes) {
        peerLinks = peerLinks.filter((link) => link[0] !== edge.from || link[1] !== edge.to);
      } else {
        cpLinks = cpLinks.filter((link) => link[0] !== edge.from || link[1] !== edge.to);
      }

      edges.remove(selectedLinkID);
      // network.setData({ nodes, edges });
      selectedLinkID = null;
      selectedLink = null;

      // Update height
      //   console.log('links in deleteEdge', cpLinks, peerLinks);
      const levels = getPropagationRanks({ cp_links: cpLinks, peer_links: peerLinks });
      nodes.forEach((node) => {
        nodes.update({ ...node, level: levels[node.id] || 1 });
      });
    }
  }

  function updateASRole() {
    if (selectedASN !== null) {
      let color: {} | null;

      if (selectedASRole === 'victim') {
        const colorProp = { border: '#047857', background: '#34d399' };
        color = { ...colorProp, highlight: colorProp, hover: colorProp };

        if (victimASN !== null && victimASN !== selectedASN) {
          nodes.update({ id: victimASN, role: null, color: null });
          delete roleMap[victimASN];
        }

        victimASN = selectedASN;
        roleMap[selectedASN] = 'victim';
      } else if (selectedASRole === 'attacker') {
        const colorProp = { border: '#b91c1c', background: '#f87171' };
        color = { ...colorProp, highlight: colorProp, hover: colorProp };
        roleMap[selectedASN] = 'attacker';
      } else {
        color = null;
        delete roleMap[selectedASN];
      }
      //   console.log(roleMap);
      nodes.update({
        id: selectedASN,
        role: selectedASRole,
        color: color
      });
    }
  }

  function updateASPolicy() {
    if (selectedASN !== null) {
      if (
        selectedASPolicy.toLowerCase() === 'rov' ||
        selectedASPolicy.toLowerCase() === 'aspa' ||
        selectedASPolicy.toLowerCase() === 'bgpsec' ||
        selectedASPolicy.toLowerCase() === 'otc' ||
        selectedASPolicy.toLowerCase() === 'pathend'
      ) {
        policyMap[selectedASN] = selectedASPolicy;
      } else {
        delete policyMap[selectedASN];
      }

      nodes.update({ id: selectedASN });
    }
  }

  function clearGraph() {
    nodes.clear();
    edges.clear();

    // Clear policy and role maps and links
    policyMap = {};
    roleMap = {};
    cpLinks = [];
    peerLinks = [];

    // Reset variables
    imageURL = '';
    selectedASN = null;
    selectedLinkID = null;
    simResults = null;
  }

  function handleContextMenuAction(action: string) {
    if (action === 'deleteNode' && selectedASN2 !== null) {
      // Log before
      //   console.log('before delete node', edges, cpLinks, peerLinks);

      // Get all connected edges to the node
      const connectedEdges = edges.get({
        filter: function (item) {
          return item.from === selectedASN2 || item.to === selectedASN2;
        }
      });

      // Remove all connected edges from the network
      edges.remove(connectedEdges.map((edge) => edge.id));
      cpLinks = cpLinks.filter((link) => link[0] !== selectedASN2 && link[1] !== selectedASN2);
      peerLinks = peerLinks.filter((link) => link[0] !== selectedASN2 && link[1] !== selectedASN2);

      // Remove the node
      nodes.remove(selectedASN2);

      // Log to check
      // console.log('after delete node', edges, cpLinks, peerLinks);

      // network.setData({ nodes, edges });
      selectedASN2 = null;
    } else if (action === 'deleteEdge' && selectedLinkID2 !== null) {
      const edge = edges.get(selectedLinkID2);
      // console.log(selectedLinkID2);
      // console.log(edge.from, edge.to);

      if (edge.dashes) {
        peerLinks = peerLinks.filter((link) => link[0] !== edge.from || link[1] !== edge.to);
      } else {
        cpLinks = cpLinks.filter((link) => link[0] !== edge.from || link[1] !== edge.to);
      }

      edges.remove(selectedLinkID2);
      selectedLinkID2 = null;
    } else if (action === 'switchEdge' && selectedLinkID2 !== null) {
      const edge = edges.get(selectedLinkID2);
      edges.update({ id: selectedLinkID2, dashes: !edge.dashes });
      if (edge.dashes) {
        peerLinks = peerLinks.filter((link) => link[0] !== edge.from || link[1] !== edge.to);
        cpLinks = [...cpLinks, [edge.from, edge.to]];
      } else {
        cpLinks = cpLinks.filter((link) => link[0] !== edge.from || link[1] !== edge.to);
        peerLinks = [...peerLinks, [edge.from, edge.to]];
      }

      selectedLinkID2 = null;
    } else if (action === 'swapCP' && selectedLinkID2 !== null) {
      const edge = edges.get(selectedLinkID2);
      edges.update({
        id: selectedLinkID2,
        from: edge.to, // Swap 'from' and 'to'
        to: edge.from
      });
      const linkIndex = cpLinks.findIndex((link) => link[0] === edge.from && link[1] === edge.to);
      if (linkIndex !== -1) {
        cpLinks[linkIndex] = [edge.to, edge.from]; // Swap the link
      }
      selectedLinkID2 = null;
    } else if (action === 'switchEdge2' && selectedLinkID !== null) {
      const edge = edges.get(selectedLinkID);
      edges.update({ id: selectedLinkID, dashes: !edge.dashes });
      if (edge.dashes) {
        peerLinks = peerLinks.filter((link) => link[0] !== edge.from || link[1] !== edge.to);
        cpLinks = [...cpLinks, [edge.from, edge.to]];
      } else {
        cpLinks = cpLinks.filter((link) => link[0] !== edge.from || link[1] !== edge.to);
        peerLinks = [...peerLinks, [edge.from, edge.to]];
      }
    } else if (action === 'swapCP2' && selectedLinkID !== null) {
      const edge = edges.get(selectedLinkID);
      edges.update({
        id: selectedLinkID,
        from: edge.to, // Swap 'from' and 'to'
        to: edge.from
      });
      const linkIndex = cpLinks.findIndex((link) => link[0] === edge.from && link[1] === edge.to);
      if (linkIndex !== -1) {
        cpLinks[linkIndex] = [edge.to, edge.from]; // Swap the link
      }
    }

    // Update prop ranks
    const levels = getPropagationRanks({ cp_links: cpLinks, peer_links: peerLinks });
    nodes.forEach((node) => {
      nodes.update({ ...node, level: levels[node.id] || 1 });
    });

    contextMenuData.show = false;
  }

  function availableNodes(array: any[], index: number, asnToIgnore: number | null = null) {
    // console.log(asnToIgnore);
    const avail = nodes
      .get()
      .filter((node: Node) => {
        return (!array.includes(node.id) || array[index] === node.id) && node.id !== asnToIgnore;
      })
      .sort((a: Node, b: Node) => Number(a.id) - Number(b.id));
    // console.log(avail);
    return avail;
  }

  function getRelationships(asn: number) {
    let customers: number[] = [];
    let providers: number[] = [];
    let peers: number[] = [];

    // edges.forEach((edge) => {
    //   if (edge.from === asn) {
    //     if (edge.arrows && edge.arrows.to) {
    //       customers.push(edge.to);
    //     } else if (edge.dashes) {
    //       peers.push(edge.to);
    //     }
    //   } else if (edge.to === asn) {
    //     if (edge.arrows && edge.arrows.to) {
    //       providers.push(edge.from);
    //     } else if (edge.dashes) {
    //       peers.push(edge.from);
    //     }
    //   }
    // });

    cpLinks.forEach((edge) => {
      if (edge[0] === asn) {
        customers.push(edge[1]);
      } else if (edge[1] === asn) {
        providers.push(edge[0]);
      }
    });

    peerLinks.forEach((edge) => {
      if (edge[0] === asn) {
        peers.push(edge[1]);
      } else if (edge[1] === asn) {
        peers.push(edge[0]);
      }
    });

    // console.log(providers);

    return { customers, providers, peers };
  }

  function findEdgeByFromTo(fromId, toId) {
    let matchingEdges = edges.get({
      filter: (edge) => {
        return edge.from === fromId && edge.to === toId;
      }
    });

    if (matchingEdges.length > 0) {
      return matchingEdges[0]; // Return the first matching edge
    } else {
      return null; // Return null if no matching edge is found
    }
  }

  function updateRelationship(type, oldASN, newASN) {
    if (type === 'provider') {
      // Update the edges DataSet
      const edge = findEdgeByFromTo(oldASN, selectedASN);
      if (edge !== null) {
        edges.remove(edge);
      }

      edges.add({
        from: newASN,
        to: selectedASN,
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8
          }
        }
      });

      // Update cpLinks array
      cpLinks = cpLinks.filter((link) => !(link[0] === oldASN && link[1] === selectedASN));
      cpLinks = [...cpLinks, [newASN, selectedASN]];
    } else if (type === 'customer') {
      const edge = findEdgeByFromTo(selectedASN, oldASN);
      if (edge !== null) {
        edges.remove(edge);
      }

      edges.add({
        from: selectedASN,
        to: newASN,
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8
          }
        }
      });

      // Update cpLinks array
      cpLinks = cpLinks.filter((link) => !(link[0] === selectedASN && link[1] === oldASN));
      cpLinks = [...cpLinks, [selectedASN, newASN]];
    } else if (type === 'peer') {
      // Remove in both directions if needed
      let edge = findEdgeByFromTo(selectedASN, oldASN);
      if (edge !== null) {
        edges.remove(edge);
      }
      edge = findEdgeByFromTo(oldASN, selectedASN);
      if (edge !== null) {
        edges.remove(edge);
      }

      edges.add({ from: selectedASN, to: newASN, dashes: true, width: 2, arrows: 'to, from' });

      // Update peerLinks array
      peerLinks = peerLinks.filter(
        (link) =>
          !(link[0] === oldASN && link[1] === selectedASN) &&
          !(link[0] === selectedASN && link[1] === oldASN)
      );
      peerLinks = [...peerLinks, [selectedASN, newASN]];
      // peerLinks;
    }

    selectedASRelationships = getRelationships(selectedASN);

    // Adjust height of graph
    const levels = getPropagationRanks({ cp_links: cpLinks, peer_links: peerLinks });
    nodes.forEach((node) => {
      nodes.update({ ...node, level: levels[node.id] || 1 });
    });
  }

  function deleteRelationship(type, targetASN) {
    if (type === 'provider') {
      // // Find the edge in the edges DataSet and remove it
      // const edgeId = edges.get({
      //   filter: function (edge) {
      //     return (
      //       (type === 'provider' && edge.from === targetASN && edge.to === selectedASN) ||
      //       (type === 'customer' && edge.from === selectedASN && edge.to === targetASN)
      //     );
      //   }
      // })[0]?.id;
      // if (edgeId) {
      //   edges.remove(edgeId);
      //   // Update cpLinks array
      //   cpLinks = cpLinks.filter(
      //     (link) =>
      //       !(link[0] === targetASN && link[1] === selectedASN) &&
      //       !(link[0] === selectedASN && link[1] === targetASN)
      //   );
      // }
      const edge = findEdgeByFromTo(targetASN, selectedASN);
      if (edge !== null) {
        edges.remove(edge);
        cpLinks = cpLinks.filter((link) => !(link[0] === targetASN && link[1] === selectedASN));
      }
    } else if (type === 'customer') {
      const edge = findEdgeByFromTo(selectedASN, targetASN);
      if (edge !== null) {
        edges.remove(edge);
        cpLinks = cpLinks.filter((link) => !(link[0] === selectedASN && link[1] === targetASN));
      }
    } else if (type === 'peer') {
      // Peers might have bidirectional edges, so check both directions
      // const edgeId1 = edges.get({
      //   filter: (edge) => edge.from === selectedASN && edge.to === targetASN
      // })[0]?.id;
      // const edgeId2 = edges.get({
      //   filter: (edge) => edge.from === targetASN && edge.to === selectedASN
      // })[0]?.id;

      // if (edgeId1) {
      //   edges.remove(edgeId1);
      // }
      // if (edgeId2) {
      //   edges.remove(edgeId2);
      // }
      // Remove in both directions if needed
      let edge = findEdgeByFromTo(selectedASN, targetASN);
      if (edge !== null) {
        edges.remove(edge);
      }
      edge = findEdgeByFromTo(targetASN, selectedASN);
      if (edge !== null) {
        edges.remove(edge);
      }

      // Update peerLinks array
      peerLinks = peerLinks.filter(
        (link) =>
          !(link[0] === selectedASN && link[1] === targetASN) &&
          !(link[0] === targetASN && link[1] === selectedASN)
      );
    }

    // Update the local state to reflect changes
    selectedASRelationships = getRelationships(selectedASN);

    // Adjust height of graph
    const levels = getPropagationRanks({ cp_links: cpLinks, peer_links: peerLinks });
    nodes.forEach((node) => {
      nodes.update({ ...node, level: levels[node.id] || 1 });
    });
  }
</script>

<!-- Add AS Modal -->
<AddASModal bind:showModal={showAddASModal} {nodes} {edges} bind:config />

<!-- Clear Graph Confirmation Modal -->
<ClearGraphModal bind:showModal={showClearGraphModal} onClear={clearGraph} />

<!-- Add Link Modal -->
<AddLinkModal bind:showModal={showAddEdgeModal} {nodes} {edges} bind:config />

<!-- Change AS Number Modal -->
<RenameASModal
  bind:showModal={showRenameASModal}
  {nodes}
  {edges}
  bind:config
  bind:oldASN={selectedASN2} />

<!-- Action Buttons -->
<div class="flex space-x-2">
  <Button
    on:click={() => (showAddASModal = true)}
    class="bg-emerald-500 hover:bg-emerald-500/90"
    size="sm">
    <!-- <Plus class="mr-2 h-4 w-4" /> -->
    Add AS
  </Button>

  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        on:click={addCPLink}
        class={addingCPLink
          ? 'bg-emerald-300 hover:bg-emerald-300/90'
          : 'bg-emerald-500 hover:bg-emerald-500/90'}
        size="sm">
        Draw Customer-Provider Link
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Create a link by dragging mouse from a provider AS to customer AS</p>
    </Tooltip.Content>
  </Tooltip.Root>

  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        on:click={addPeerLink}
        class={addingPeerLink
          ? 'bg-emerald-300 hover:bg-emerald-300/90'
          : 'bg-emerald-500 hover:bg-emerald-500/90'}
        size="sm">
        Draw Peer Link
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Create a link by dragging mouse from a peer AS to another</p>
    </Tooltip.Content>
  </Tooltip.Root>

  <Tooltip.Root>
    <Tooltip.Trigger>
      <!-- Clear Graph -->
      <Button on:click={() => (showClearGraphModal = true)} variant="destructive" size="sm">
        <Ban class="size-4" />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Clear the graph</p>
    </Tooltip.Content>
  </Tooltip.Root>

  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        variant="outline"
        size="sm"
        on:click={() =>
          network.moveTo({
            scale: network.getScale() * 1.25,
            animation: { duration: 200, easingFunction: 'linear' }
          })}>
        <ZoomIn class="size-5" />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Zoom in</p>
    </Tooltip.Content>
  </Tooltip.Root>

  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        variant="outline"
        size="sm"
        on:click={() =>
          network.moveTo({
            scale: network.getScale() / 1.25,
            animation: { duration: 200, easingFunction: 'linear' }
          })}>
        <ZoomOut class="size-5" />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Zoom out</p>
    </Tooltip.Content>
  </Tooltip.Root>

  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button
        variant="outline"
        size="sm"
        on:click={() => network.fit({ animation: { duration: 200, easingFunction: 'linear' } })}>
        <Fullscreen class="size-5" />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Center graph</p>
    </Tooltip.Content>
  </Tooltip.Root>

  {#if simResults}
    <Tooltip.Root>
      <Tooltip.Trigger>
        <!-- Legend -->
        <Popover.Root
          open={showLegend}
          onOutsideClick={() => {
            showLegend = false;
          }}>
          <Popover.Trigger>
            <Button
              variant="outline"
              size="sm"
              on:click={() => {
                showLegend = !showLegend;
              }}>
              <Info class="size-5" />
            </Button>
          </Popover.Trigger>
          <Popover.Content class="w-80">
            <table class="text-center">
              <tr class="border-0">
                <td>(For most specific prefix only)</td>
              </tr>
              <tr>
                <td class="bg-gradient-to-r from-orange-500 to-white border border-black">
                  &#128520; ATTACKER SUCCESS &#128520;
                </td>
                <td class="px-4 border border-black">{countByValue(simResults.outcome, 0)}</td>
              </tr>
              <tr>
                <td class="bg-gradient-to-r from-green-400 to-white border border-black">
                  &#128519; VICTIM SUCCESS &#128519;
                </td>
                <td class="px-4 border border-black">{countByValue(simResults.outcome, 1)}</td>
              </tr>
              <tr>
                <td class="bg-gradient-to-r from-gray-400 to-white border border-black">
                  &#10041; DISCONNECTED &#10041;
                </td>
                <td class="px-4 border border-black">{countByValue(simResults.outcome, 2)}</td>
              </tr>
            </table>
          </Popover.Content>
        </Popover.Root>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <p>Simulation results legend</p>
      </Tooltip.Content>
    </Tooltip.Root>
  {/if}
</div>

<!-- Canvas for calculating max radius -->
<canvas bind:this={canvas} hidden></canvas>

<!-- Graph -->
<div
  bind:this={container}
  class={`mt-2 w-full h-[75vh] overflow-auto ${addingEdge ? 'cursor-crosshair' : 'cursor-auto'}`}>
</div>

{#if selectedASN !== null}
  <Card.Root class="mx-auto lg:max-w-[50vw] max-w-full relative mb-4">
    <Card.Header>
      <Card.Title>Selected AS: {selectedASN}</Card.Title>
      <button
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        on:click={() => (selectedASN = null)}>
        <X class="h-4 w-4" />
        <span class="sr-only">Close</span>
      </button>
    </Card.Header>

    <Card.Content>
      <div class="grid gap-4">
        <!-- <div class="grid grid-cols-5 items-center gap-4">
            <Label class="text-right">AS Number</Label>
            <Input value={selectedASN} on:change={updateASN} class="col-span-4" type="number" />
          </div> -->

        <div class="grid grid-cols-5 items-center gap-4">
          <Label class="text-right">Policy</Label>
          <select
            bind:value={selectedASPolicy}
            on:change={updateASPolicy}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-4">
            <option value="bgp">BGP</option>
            <option value="rov">ROV</option>
            <option value="aspa">ASPA</option>
            <option value="bgpsec">BGPSec</option>
            <option value="otc">Only to Customers</option>
            <option value="pathend">Pathend</option>
          </select>
        </div>

        <div class="grid grid-cols-5 items-center gap-4">
          <Label class="text-right">Role</Label>
          <select
            bind:value={selectedASRole}
            on:change={updateASRole}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-4">
            <option value="">None</option>
            <option value="attacker">Attacker</option>
            <option value="victim">Victim</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 mt-4">
        <!-- Providers Column -->
        <div class="border p-4 rounded-lg">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-md font-medium">Providers</h2>
            <Button
              size="icon"
              variant="outline"
              class="size-7"
              on:click={() =>
                (selectedASRelationships.providers = [...selectedASRelationships.providers, null])}>
              <Plus class="size-4" />
            </Button>
          </div>
          <div class="space-y-2">
            {#each selectedASRelationships.providers as provider, index}
              <div class="grid grid-cols-4 gap-2">
                <select
                  value={selectedASRelationships.providers[index]}
                  on:change={(e) =>
                    updateRelationship('provider', provider, Number(e.target.value))}
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-3">
                  <option value={null}>Select an AS</option>
                  {#each availableNodes(selectedASRelationships.providers, index, Number(selectedASN)) as node}
                    <option value={node.id}>{node.label || node.id}</option>
                  {/each}
                </select>

                <Button
                  size="icon"
                  variant="outline"
                  class="col-span-1"
                  on:click={() => deleteRelationship('provider', provider)}>
                  <Trash2 class="size-4" />
                </Button>
              </div>
            {/each}
          </div>
        </div>

        <!-- Customers Column -->
        <div class="border p-4 rounded-lg">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-md font-medium">Customers</h2>
            <Button
              size="icon"
              variant="outline"
              class="size-7"
              on:click={() =>
                (selectedASRelationships.customers = [...selectedASRelationships.customers, null])}>
              <Plus class="size-4" />
            </Button>
          </div>
          <div class="space-y-2">
            {#each selectedASRelationships.customers as customer, index}
              <div class="grid grid-cols-4 gap-2">
                <select
                  value={selectedASRelationships.customers[index]}
                  on:change={(e) =>
                    updateRelationship('customer', customer, Number(e.target.value))}
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-3">
                  <option value={null}>Select an AS</option>
                  {#each availableNodes(selectedASRelationships.customers, index, Number(selectedASN)) as node}
                    <option value={node.id}>{node.label || node.id}</option>
                  {/each}
                </select>

                <Button
                  size="icon"
                  variant="outline"
                  class="col-span-1"
                  on:click={() => deleteRelationship('customer', customer)}>
                  <Trash2 class="size-4" />
                </Button>
              </div>
            {/each}
          </div>
        </div>

        <!-- Peers Column -->
        <div class="border p-4 rounded-lg">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-md font-medium">Peers</h2>
            <Button
              size="icon"
              variant="outline"
              class="size-7"
              on:click={() =>
                (selectedASRelationships.peers = [...selectedASRelationships.peers, null])}>
              <Plus class="size-4" />
            </Button>
          </div>
          <div class="space-y-2">
            {#each selectedASRelationships.peers as peer, index}
              <div class="grid grid-cols-4 gap-2">
                <select
                  value={selectedASRelationships.peers[index]}
                  on:change={(e) => updateRelationship('peer', peer, Number(e.target.value))}
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-3">
                  <option value={null}>Select an AS</option>
                  {#each availableNodes(selectedASRelationships.peers, index, Number(selectedASN)) as node}
                    <option value={node.id}>{node.label || node.id}</option>
                  {/each}
                </select>

                <Button
                  size="icon"
                  variant="outline"
                  class="col-span-1"
                  on:click={() => deleteRelationship('peer', peer)}>
                  <Trash2 class="size-4" />
                </Button>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </Card.Content>

    <Card.Footer>
      <Button on:click={deleteNode} variant="destructive">Delete AS</Button>
    </Card.Footer>
  </Card.Root>
{/if}

{#if selectedLinkID !== null}
  <Card.Root class="mx-auto w-full relative">
    <Card.Header>
      <Card.Title>
        Selected Link: {selectedLink.from} to {selectedLink.to}
      </Card.Title>
      <Card.Description>
        {edges.get(selectedLinkID).dashes ? 'Peer' : 'Customer-Provider'} Link
      </Card.Description>
      <button
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        on:click={() => (selectedLinkID = null)}>
        <X class="h-4 w-4" />
        <span class="sr-only">Close</span>
      </button>
    </Card.Header>
    <Card.Footer class="space-x-2">
      {#if edges.get(selectedLinkID).dashes}
        <Button on:click={() => handleContextMenuAction('switchEdge2')} variant="outline">
          Switch to CP Link
        </Button>
      {:else}
        <Button on:click={() => handleContextMenuAction('swapCP2')} variant="outline">
          Swap Customer and Provider
        </Button>
        <Button on:click={() => handleContextMenuAction('switchEdge2')} variant="outline">
          Switch to Peer Link
        </Button>
      {/if}

      <Button on:click={deleteEdge} variant="destructive">Delete Link</Button>
    </Card.Footer>
  </Card.Root>
{/if}

{#if contextMenuData.show}
  <div
    transition:flyAndScale
    class="z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md focus:outline-none absolute"
    style="left: {contextMenuData.x}px; top: {contextMenuData.y}px;">
    {#if selectedASN2 !== null}
      <button
        class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
        on:click={() => {
          showRenameASModal = true;
          contextMenuData.show = false;
        }}>
        <Pencil class="size-4 mr-2" />
        Change AS Number
      </button>
      <button
        class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full"
        on:click={() => handleContextMenuAction('deleteNode')}>
        <Trash2 class="size-4 mr-2" />
        Delete AS
      </button>
    {:else if selectedLinkID2 !== null}
      {#if edges.get(selectedLinkID2).dashes}
        <button
          class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full"
          on:click={() => handleContextMenuAction('switchEdge')}>
          <ArrowLeftRight class="size-4 mr-2" />
          Switch to CP Link
        </button>
      {:else}
        <button
          class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full"
          on:click={() => handleContextMenuAction('switchEdge')}>
          <ArrowLeftRight class="size-4 mr-2" />
          Switch to Peer Link
        </button>
        <button
          class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full"
          on:click={() => handleContextMenuAction('swapCP')}>
          <ArrowLeftRight class="size-4 mr-2" />
          Swap Customer and Provider
        </button>
      {/if}
      <button
        class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full"
        on:click={() => handleContextMenuAction('deleteEdge')}>
        <Trash2 class="size-4 mr-2" />
        Delete Link
      </button>
    {:else}
      <button
        class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full"
        on:click={() => {
          showAddASModal = true;
          contextMenuData.show = false;
        }}>
        Add AS
      </button>
      <button
        class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full"
        on:click={() => {
          showAddEdgeModal = true;
          contextMenuData.show = false;
        }}>
        Add Link
      </button>
    {/if}
  </div>
{/if}
