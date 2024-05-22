<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Network,
    DataSet,
    type Options,
    type Node,
    type Edge,
    type IdType
  } from 'vis-network/standalone';
  import { type Config, type SimResults as SimResults } from '$lib/types';
  import { Fullscreen, ZoomIn, ZoomOut, Ban, Info } from 'lucide-svelte';
  import { countByValue, createGraph, flyAndScale } from '$lib/utils';
  import { createCPEdge, createPeerEdge, getEdgeByFromTo } from '$lib/utils/link';
  import {
    drawLocalRIB,
    drawShape,
    drawText,
    getFormattedASPolicyName,
    getLocalRIBData,
    getMaxNodeRadius,
    getMaxWidths,
    getNodeRadius
  } from '$lib/utils/drawing';
  import {
    getASCustomers,
    getASLevel,
    getASPeers,
    getASPolicy,
    getASProviders,
    getASRole,
    updatePropRanks
  } from '$lib/utils/as';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import Button from '$lib/components/ui/button/button.svelte';
  import AddASModal from './add-as-modal.svelte';
  import ClearGraphModal from './clear-graph-modal.svelte';
  import AddLinkModal from './add-link-modal.svelte';
  import RenameASModal from './rename-as-modal.svelte';
  import ASDetailsCard from './as-details-card.svelte';
  import LinkDetailsCard from './link-details-card.svelte';
  import GraphContextMenu from './graph-context-menu.svelte';

  // Props
  export let nodes: DataSet<Node>;
  export let edges: DataSet<Edge>;
  export let config: Config;
  export let simResults: SimResults | null;
  export let imageURL: string;
  export let graphLoadingState: string;

  // Vis-network
  // let maxRadius = 0;
  let container: HTMLDivElement;
  let network: Network | undefined;
  let options: Options = {
    // Configuration for vis-network
    // configure: true,
    nodes: {
      shape: 'custom',
      borderWidth: 2,
      // @ts-ignore ctxRenderer does not have types in vis-network
      ctxRenderer: ({ ctx, id, x, y, state: { selected, hover }, style, label }) => {
        ctx.save();

        // Font for the node
        const fontSize = 14;
        ctx.font = `${fontSize}px Inter`;

        // Get local RIB data
        const rows = getLocalRIBData(simResults, id);

        // Find the max width for each column in local RIB table
        const maxWidths = getMaxWidths(ctx, rows);

        // Calculate dimensions of Local RIB table
        const cellHeight = fontSize + 10;
        const tableWidth = maxWidths.reduce((sum, a) => sum + a, 0);
        const tableHeight = cellHeight * (rows.length + 1);

        // Get formatted AS policy name
        const nodePolicy = getFormattedASPolicyName(config.asn_policy_map, id);

        // Ensure nodes are around the same size
        const maxRadius = getMaxNodeRadius(ctx, simResults, config.asn_policy_map, nodes);
        let r = getNodeRadius(ctx, tableWidth, nodePolicy, rows);
        if (rows.length > 0 && maxRadius * 0.75 > r) {
          r = maxRadius * 0.75;
        }

        // Style for shape
        ctx.fillStyle = style.color;
        ctx.strokeStyle = style.borderColor;
        ctx.lineWidth = selected || hover ? 4 : 2;

        // Draw border of shape and color it in
        drawShape(ctx, nodePolicy, x, y, r);

        // Put the ASN and policy in the middle of the node
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Calculate the total height for centering
        const totalHeight = (rows.length > 0 ? tableHeight : 0) + 2 * fontSize + 20;

        // Draw ASN and policy
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
    manipulation: {
      enabled: false,
      addEdge: (data: Edge, callback: any) => {
        // Prevent adding circular edge
        if (data.from === data.to) {
          network?.disableEditMode();
          drawingCPLink = false;
          drawingPeerLink = false;
          return;
        }

        // Prevent adding duplicate edge
        const fromASN = Number(data.from);
        const toASN = Number(data.to);
        const edge = getEdgeByFromTo(fromASN, toASN, edges);
        if (edge !== null) {
          return;
        }

        if (drawingCPLink) {
          data = createCPEdge(fromASN, toASN);
          config.graph.cp_links = [...config.graph.cp_links, [fromASN, toASN]];
        } else if (drawingPeerLink) {
          data = createPeerEdge(fromASN, toASN);
          config.graph.peer_links = [...config.graph.peer_links, [fromASN, toASN]];
        }

        // Callback
        callback(data);

        // If we added an edge to the selected AS, reselect it so that it shows up on the details
        // card
        if (fromASN === selectedASN || toASN === selectedASN) {
          refreshSelectedAS();
        }

        // Adjust height of graph
        updatePropRanks(nodes, config);

        // And disable edit mode
        network?.disableEditMode();

        // Reset buttons
        drawingCPLink = false;
        drawingPeerLink = false;
      }
    },
    interaction: { hover: true, zoomSpeed: 0.7, zoomView: false },
    physics: false
  };

  // Data for selected ASes and links
  // TODO: Group all "selected" AS/link variables into separate types
  let selectedAS: Node | null = null;
  let selectedASN: number | null = null;
  let selectedASRole: string | null = null;
  let selectedASPolicy: string | null = null;
  let selectedASLevel: number | null = null;
  let selectedASProviders = Array<number | null>();
  let selectedASCustomers = Array<number | null>();
  let selectedASPeers = Array<number | null>();
  let selectedLink: Edge | null = null;
  let selectedLinkID: string | null = null;

  // Store ASes and links that we hover over to determine which context menu actions to display
  let hoveredASN: number | null = null;
  let hoveredLink: Edge | null = null;

  // Data for context menu
  let showContextMenu = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let contextMenuASN: number | null = null;
  let contextMenuLink: Edge | null = null;

  // State variables for modals
  let showAddASModal = false;
  let showClearGraphModal = false;
  let showAddLinkModal = false;
  let showRenameASModal = false;
  let showLegend = false;

  // Determine whether we're drawing a CP link or peer link
  let drawingCPLink = false;
  let drawingPeerLink = false;

  // Reference to hidden canvas element
  let canvas: HTMLCanvasElement | undefined;

  // TODO: Remove old code
  let selectedASN2: any | null = null;
  let selectedLinkID2: string | null = null;
  let nodeData: {} | null = null;
  let edgeData: {} | null = null;
  let contextMenuData = { show: false, x: 0, y: 0 };
  let victimASN: any | null = null;
  let newLinkType: string | null = null;
  let addingLink = false;
  let selectedASRelationships = {
    customers: Array<number | null>(),
    providers: Array<number | null>(),
    peers: Array<number | null>()
  };

  // Used for vis-network's `on('click')` event handler signature
  // https://visjs.github.io/vis-network/docs/network/#Events
  type VisNetworkOnClickParams = {
    nodes: IdType[];
    edges: IdType[];
    event: object[];
    pointer: {
      DOM: { x: number; y: number };
      canvas: { x: number; y: number };
    };
  };

  onMount(() => {
    // Initialize network
    network = new Network(container, { nodes, edges }, options);
    container.addEventListener('wheel', handleWheel, { passive: false });

    network.on('click', (params: VisNetworkOnClickParams) => {
      if (params.nodes.length > 0) {
        // Deselect edge
        deselectLink();

        // Select node
        selectAS(Number(params.nodes[0]));
      } else if (params.edges.length > 0) {
        // Deselect node
        deselectAS();

        // Select link
        selectLink(String(params.edges[0]));
      }

      showContextMenu = false;

      // TODO: Remove old code
      contextMenuData.show = false;
    });

    network.on('deselectNode', () => {
      deselectAS();
      showContextMenu = false;

      // TODO: Remove old code
      contextMenuData.show = false;
    });

    network.on('deselectEdge', () => {
      deselectLink();
      showContextMenu = false;

      // TODO: Remove old code
      contextMenuData.show = false;
    });

    // Right click
    network.on('oncontext', function (params) {
      // params.event.preventDefault();

      // TODO: Remove old context menu code
      // let show = false;
      // if (nodeData !== null) {
      //   selectedASN2 = nodeData.id;
      //   selectedLinkID2 = null;
      //   show = true;
      //   params.event.preventDefault();
      //   nodeData = null;
      // } else if (edgeData !== null) {
      //   // selectedLinkID = edgeData.id;
      //   selectedLinkID2 = edgeData.id;
      //   selectedASN2 = null;
      //   show = true;
      //   params.event.preventDefault();
      // } else {
      //   selectedASN2 = null;
      //   selectedLinkID2 = null;
      //   show = true;
      //   params.event.preventDefault();
      // }
      // contextMenuData = {
      //   show: show,
      //   x: params.event.pageX,
      //   y: params.event.pageY
      // };

      // New code
      params.event.preventDefault();
      contextMenuX = params.event.pageX;
      contextMenuY = params.event.pageY;

      if (hoveredASN !== null) {
        contextMenuASN = hoveredASN;
        contextMenuLink = null;
      } else if (hoveredLink !== null) {
        contextMenuLink = hoveredLink;
        contextMenuASN = null;
      } else {
        contextMenuASN = null;
        contextMenuLink = null;
      }

      showContextMenu = true;
    });

    // Show Local RIB on hover
    network.on('hoverNode', (params) => {
      if (drawingCPLink || drawingPeerLink) {
        return;
      }

      hoveredASN = params.node;

      // TODO: Remove old code
      // if (addingLink) {
      //   return;
      // }

      // const node = nodes.get(params.node);
      // if (node === null) {
      //   return;
      // }
      // nodeData = {
      //   id: node.id,
      //   policy: node.policy || 'BGP',
      //   x: params.event.pageX,
      //   y: params.event.pageY
      // };
    });

    network.on('blurNode', (params) => {
      hoveredASN = null;

      // TODO: Remove old code
      nodeData = null;
    });

    network.on('hoverEdge', (params) => {
      if (drawingCPLink || drawingPeerLink) {
        return;
      }

      const link = edges.get(params.edge);
      hoveredLink = link;

      // TODO: Remove old code
      // edgeData = {
      //   id: link.id,
      //   x: params.event.pageX,
      //   y: params.event.pageY
      // };
    });

    network.on('blurEdge', (params) => {
      hoveredLink = null;

      // TODO: Remove old code
      edgeData = null;
    });

    // TODO: Remove old code
    // TODO: MOVE SOMEWHRE ELSE
    // Find victim when first initialized
    // const victims = Object.entries(roleMap)
    //   .filter(([_, value]) => value === 'victim')
    //   .map(([key, _]) => key);
    // if (victims.length > 0) {
    //   victimASN = Number(victims[0]);
    // }
  });

  onDestroy(() => {
    if (network) {
      network.destroy();
    }
  });

  function updateSeparationDistance() {
    if (!canvas || !network) {
      return;
    }

    const ctx = canvas.getContext('2d')!;
    ctx.font = '14px Inter';

    // Calculate radius of each node and set a new separation distance based on the size of the
    // largest node
    const maxRadius = getMaxNodeRadius(ctx, simResults, config.asn_policy_map, nodes);
    setNodeDistance(Math.max(200, 130 + maxRadius), Math.max(200, 130 + maxRadius));

    centerGraph();
  }

  // For some reason, this gets run twice after a simulation is ran once
  // TODO: Move this logic to handleSubmit
  $: if (simResults !== null) {
    updateSeparationDistance();

    deselectAS();
    deselectLink();

    // Show legend after simulation is ran
    showLegend = true;

    console.log('simResults is not null', simResults);
  }

  $: if (simResults === null && network) {
    // Every time a graph is reset, set the separation distance back to 200
    setNodeDistance(200, 200);

    console.log('simresults is null');
  }

  // Ran every time a new graph is loaded
  $: if ((graphLoadingState === 'file' || graphLoadingState === 'example') && network) {
    centerGraph();

    deselectAS();
    deselectLink();

    graphLoadingState = '';
    imageURL = '';
  }

  // $: selectedASN, console.log('changed', selectedASN);

  function selectAS(asn: number) {
    selectedASN = asn;
    selectedAS = nodes.get(selectedASN);

    // Something went wrong
    if (selectedAS === null) {
      deselectAS();
      console.log(`error: selected AS ${asn} does not exist in nodes dataset!`);
      return;
    }

    selectedASRole = getASRole(selectedASN, config);
    selectedASPolicy = getASPolicy(selectedASN, config);
    selectedASLevel = getASLevel(selectedAS, config);
    selectedASProviders = getASProviders(selectedASN, config);
    selectedASCustomers = getASCustomers(selectedASN, config);
    selectedASPeers = getASPeers(selectedASN, config);

    // selectedASRelationships = getRelationships(selectedASN as number);
  }

  function selectLink(id: string) {
    selectedLinkID = id;
    selectedLink = edges.get(selectedLinkID);
  }

  function refreshSelectedAS() {
    if (selectedASN !== null) {
      network?.selectNodes([selectedASN], true);
      selectAS(selectedASN);
    }
  }

  function deselectAS() {
    selectedAS = null;
    selectedASN = null;
    selectedASLevel = null;
    selectedASRole = null;
    selectedASPolicy = null;
    selectedASProviders = [];
    selectedASCustomers = [];
    selectedASPeers = [];
  }

  function deselectLink() {
    selectedLink = null;
    selectedLinkID = null;
  }

  function zoomIn() {
    network?.moveTo({
      scale: network.getScale() * 1.25,
      animation: { duration: 200, easingFunction: 'linear' }
    });
  }

  function zoomOut() {
    network?.moveTo({
      scale: network.getScale() / 1.25,
      animation: { duration: 200, easingFunction: 'linear' }
    });
  }

  function centerGraph() {
    network?.fit();
    if (simResults) {
      network?.moveTo({
        scale: network.getScale() - 0.05
      });
    }
  }

  function setNodeDistance(verticalDistance: number, horizontalDistance: number) {
    network?.setOptions({
      ...options,
      layout: {
        hierarchical: {
          ...options.layout.hierarchical,
          levelSeparation: verticalDistance,
          nodeSpacing: horizontalDistance
        }
      }
    });
  }

  function handleWheel(event: WheelEvent) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const direction = event.deltaY > 0 ? 1 / 1.1 : 1.1;
      network?.moveTo({
        scale: network.getScale() * direction,
        animation: { duration: 50, easingFunction: 'linear' }
      });
    }
  }

  function addCPLink() {
    if (!drawingCPLink) {
      network?.addEdgeMode();
      drawingCPLink = true;

      // TODO: Remove old code
      // newLinkType = 'customer-provider';
      // addingLink = true;
    } else {
      network?.disableEditMode();
      drawingCPLink = false;

      // TODO: Remove old code
      // addingLink = false;
    }

    drawingPeerLink = false;
  }

  function addPeerLink() {
    if (!drawingPeerLink) {
      network?.addEdgeMode();
      drawingPeerLink = true;

      // TODO: Remove old code
      // newLinkType = 'peer';
      // addingLink = true;
    } else {
      network?.disableEditMode();
      drawingPeerLink = false;

      // TODO: Remove old code
      // addingLink = false;
    }

    drawingCPLink = false;
  }

  function clearGraph() {
    // Clear graph
    nodes.clear();
    edges.clear();

    // Clear links, policy map, and roles
    config.graph = createGraph();
    config.asn_policy_map = {};
    config.victim_asns = [];
    config.attacker_asns = [];

    // Reset variables
    deselectAS();
    deselectLink();
    imageURL = '';
    simResults = null;
  }
</script>

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
        class={drawingCPLink
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
        class={drawingPeerLink
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
      <Button variant="outline" size="sm" on:click={zoomIn}>
        <ZoomIn class="size-5" />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Zoom in</p>
    </Tooltip.Content>
  </Tooltip.Root>

  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button variant="outline" size="sm" on:click={zoomOut}>
        <ZoomOut class="size-5" />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Zoom out</p>
    </Tooltip.Content>
  </Tooltip.Root>

  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button variant="outline" size="sm" on:click={centerGraph}>
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
        <Button
          variant="outline"
          size="sm"
          on:click={() => {
            showLegend = !showLegend;
          }}>
          <Info class="size-5" />
        </Button>
        {#if showLegend}
          <div
            transition:flyAndScale
            class="z-50 w-80 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none absolute -translate-x-[85%] select-text cursor-auto">
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
          </div>
        {/if}
      </Tooltip.Trigger>
      <Tooltip.Content>
        <p>Simulation results legend</p>
      </Tooltip.Content>
    </Tooltip.Root>
  {/if}
</div>

<!-- Hidden canvas for calculating max radius -->
<canvas bind:this={canvas} hidden></canvas>

<!-- Graph -->
<div
  bind:this={container}
  class={`mt-2 w-full h-[75vh] overflow-auto ${
    drawingCPLink || drawingPeerLink ? 'cursor-crosshair' : 'cursor-auto'
  } ${hoveredASN !== null || hoveredLink !== null ? 'cursor-pointer' : 'cursor-auto'}`}>
</div>

<!-- Add AS Modal -->
<AddASModal
  bind:showModal={showAddASModal}
  {nodes}
  {edges}
  bind:config
  {refreshSelectedAS}
  {centerGraph} />

<!-- Clear Graph Confirmation Modal -->
<ClearGraphModal bind:showModal={showClearGraphModal} onClear={clearGraph} />

<!-- Add Link Modal -->
<AddLinkModal bind:showModal={showAddLinkModal} {nodes} {edges} bind:config {refreshSelectedAS} />

<!-- Change AS Number Modal -->
<RenameASModal
  bind:showModal={showRenameASModal}
  {nodes}
  {edges}
  bind:config
  bind:oldASN={contextMenuASN} />

<!-- Show details when a node is selected -->
<ASDetailsCard
  bind:selectedASN
  bind:selectedASPolicy
  bind:selectedASRole
  bind:selectedASLevel
  bind:selectedASProviders
  bind:selectedASCustomers
  bind:selectedASPeers
  {nodes}
  {edges}
  bind:config
  {centerGraph} />

<!-- Show details when a link is selected -->
<LinkDetailsCard bind:selectedLinkID bind:selectedLink {nodes} {edges} bind:config />

<!-- Show custom context menu when right clicking on the graph -->
<GraphContextMenu
  bind:showMenu={showContextMenu}
  bind:x={contextMenuX}
  bind:y={contextMenuY}
  bind:contextASN={contextMenuASN}
  bind:contextLink={contextMenuLink}
  {nodes}
  {edges}
  bind:config
  onRename={() => (showRenameASModal = true)}
  onAddAS={() => (showAddASModal = true)}
  onAddLink={() => (showAddLinkModal = true)}
  {refreshSelectedAS}
  {deselectAS}
  {deselectLink} />
