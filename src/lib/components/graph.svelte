<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Network, DataSet, type Options } from 'vis-network/standalone';
  import Modal from './modal.svelte';
  import { Ban, Plus } from 'lucide-svelte';
  import { USE_FILE_MENU, getPropagationRanks } from '$lib';
  import * as ContextMenu from './ui/context-menu';
  import * as Dialog from './ui/dialog';
  import * as AlertDialog from './ui/alert-dialog';
  import { Input } from './ui/input';
  import { Label } from './ui/label';
  import Button from './ui/button/button.svelte';

  export let nodes: DataSet<{}>;
  export let edges: DataSet<{}>;
  export let simulationResults: {} | null;
  export let cpLinks: number[][];
  export let peerLinks: number[][];
  export let showModal: boolean;
  export let showClearGraphModal: boolean;

  let container: HTMLDivElement;
  let network: Network;
  let options: Options;
  let selectedAS = null;
  let selectedASN = null;
  let selectedASLevel = null;
  let selectedASRole = null;
  let selectedASPolicy = null;
  let selectedLink = null;
  let selectedLinkID = null;
  let selectedASN2 = null;
  let selectedLinkID2 = null;
  let showAddEdgeModal = false;
  let showConfirmAddEdgeModal = false;
  let newNodeId;
  let newASPolicy = 'bgp';
  let newASRole = '';
  let newEdgeFrom;
  let newEdgeTo;
  let newPeer1;
  let newPeer2;
  let edgeType = 'customer-provider'; // Default edge type
  let callbackFunc;
  let callbackData;
  let nodeData: {} | null = null;
  let edgeData: {} | null = null;
  let contextMenuData = { show: false, x: 0, y: 0 };
  let victimASN = null;
  let newLinkType = null;
  let addingEdge = false;
  let rightClick = false;

  onMount(() => {
    // Configuration for the network
    options = {
      // configure: true,
      nodes: {
        shape: 'dot',
        size: 30,
        font: {
          size: 20
        },
        borderWidth: 2
        // color: {
        //   background: '#38bdf8'
        // }
      },
      layout: {
        hierarchical: {
          enabled: true,
          levelSeparation: 150,
          nodeSpacing: 150,
          treeSpacing: 150,
          direction: 'UD', // UD: Up-Down
          sortMethod: 'directed'
        }
      },
      edges: {
        width: 2
      },
      manipulation: {
        enabled: false,
        addEdge: (data, callback) => {
          if (newLinkType === 'customer-provider') {
            // customer-provider logic
            data.arrows = {
              to: {
                enabled: true,
                scaleFactor: 0.8
              }
            };
            cpLinks = [...cpLinks, [data.from, data.to]];
          } else if (newLinkType === 'peer') {
            // peer-to-peer edge logic
            data.dashes = true;
            // data.width = 2;
            data.arrows = 'to, from';
            peerLinks = [...peerLinks, [data.from, data.to]];
          }
          newLinkType = null;

          // Callback
          callback(data);

          // Adjust height of graph
          const levels = getPropagationRanks({ cp_links: cpLinks, peer_links: peerLinks });
          console.log('levels', levels);
          nodes.forEach((node) => {
            nodes.update({ ...node, level: levels[node.id] || 1 });
          });
          // And disable edit mode
          network.disableEditMode();
          // Re-enable hover
          // network.setOptions({ ...options, interaction: { hover: true } });
          addingEdge = false;
        }
      },
      interaction: { hover: true, zoomSpeed: 0.7 },
      physics: false
    };

    // Initialize network
    network = new Network(container, { nodes, edges }, options);
    network.disableEditMode();

    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        selectedLinkID = null;
        selectedLink = null;
        selectedASN = params.nodes[0];
        selectedAS = nodes.get(selectedASN);
        selectedASLevel = selectedAS.level;
        selectedASRole = selectedAS.role || ''; // Get the role of the selected node
        selectedASPolicy = selectedAS.policy || 'bgp';
        console.log(selectedAS);
      } else if (params.edges.length > 0) {
        selectedASN = null;
        selectedAS = null;
        selectedASLevel = null;
        selectedLinkID = params.edges[0];
        selectedLink = edges.get(selectedLinkID);
      }

      contextMenuData.show = false;
      rightClick = true;
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
      rightClick = true;
      let show = false;

      // console.log(network.getNodeAt(network.DOMtoCanvas({ x: event.pageX, y: event.pageY })));
      if (nodeData !== null) {
        // selectedASN = nodeData.id;
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

  function addNode() {
    if (newNodeId) {
      const newNode = {
        id: newNodeId,
        label: String(newNodeId),
        level: 1
      };

      // TODO: Refactor
      // This code is really, really bad
      let shape: string | null;
      if (
        newASPolicy.toLowerCase() === 'rov' ||
        newASPolicy.toLowerCase() === 'aspa' ||
        newASPolicy.toLowerCase() === 'bgpsec' ||
        newASPolicy.toLowerCase() === 'otc' ||
        newASPolicy.toLowerCase() === 'pathend'
      ) {
        shape = 'hexagon';
      } else {
        shape = null;
      }
      newNode.policy = newASPolicy;
      newNode.shape = shape;
      if (newASRole === 'victim') {
        newNode.color = { border: '#047857', background: '#34d399' };
        newNode.role = newASRole;
      } else if (newASRole === 'attacker') {
        newNode.color = { border: '#b91c1c', background: '#f87171' };
        newNode.role = newASRole;
      }

      nodes.add(newNode);
      network.setData({ nodes, edges });

      //     function updateASRole() {
      //   if (selectedASN !== null) {
      //     let color: {} | null;

      //     if (selectedASRole === 'victim') {
      //       color = { border: '#047857', background: '#34d399' };

      //       if (victimASN !== null && victimASN !== selectedASN) {
      //         nodes.update({ id: victimASN, role: null, color: null });
      //       }

      //       victimASN = selectedASN;
      //     } else if (selectedASRole === 'attacker') {
      //       color = { border: '#b91c1c', background: '#f87171' };
      //     } else {
      //       color = null;
      //     }
      //     nodes.update({ id: selectedASN, role: selectedASRole, color: color });
      //   }
      // }

      // function updateASPolicy() {
      //   if (selectedASN !== null) {
      //     let shape: string | null;
      //     if (
      //       selectedASPolicy.toLowerCase() === 'rov' ||
      //       selectedASPolicy.toLowerCase() === 'aspa' ||
      //       selectedASPolicy.toLowerCase() === 'bgpsec' ||
      //       selectedASPolicy.toLowerCase() === 'otc' ||
      //       selectedASPolicy.toLowerCase() === 'pathend'
      //     ) {
      //       shape = 'hexagon';
      //     } else {
      //       shape = null;
      //     }
      //     nodes.update({ id: selectedASN, policy: selectedASPolicy, shape: shape });
      //   }
      // }

      // Reset input
      newNodeId = '';
      newASPolicy = 'bgp';
      newASRole = '';

      showModal = false; // Close modal
    }
  }

  function addEdge() {
    if (edgeType === 'customer-provider' && newEdgeFrom && newEdgeTo) {
      // Customer-provider edge logic
      const newEdge = {
        from: newEdgeFrom,
        to: newEdgeTo
      };
      edges.add(newEdge);
      network.setData({ nodes, edges });
      // cpLinks.push([newEdgeFrom, newEdgeTo]);
      cpLinks = [...cpLinks, [newEdgeFrom, newEdgeTo]];
      newEdgeFrom = '';
      newEdgeTo = ''; // Reset inputs
      showAddEdgeModal = false; // Close modal
    } else if (edgeType === 'peer' && newPeer1 && newPeer2) {
      // peer-to-peer edge logic
      const newEdge = {
        from: newPeer1,
        to: newPeer2,
        dashes: true,
        width: 2,
        arrows: 'to, from'
      };
      edges.add(newEdge);
      network.setData({ nodes, edges });
      // peerLinks.push([newPeer1, newPeer2]);
      peerLinks = [...peerLinks, [newPeer1, newPeer2]];
      newPeer1 = '';
      newPeer2 = ''; // Reset inputs
      showAddEdgeModal = false; // Close modal
    }

    // Adjust height of graph
    const levels = getPropagationRanks({ cp_links: cpLinks, peer_links: peerLinks });
    console.log('levels', levels);
    nodes.forEach((node) => {
      nodes.update({ ...node, level: levels[node.id] || 1 });
    });
  }

  export function addCPLink() {
    network.addEdgeMode();
    newLinkType = 'customer-provider';
    // network.setOptions({ ...options, interaction: { hover: false } });
    addingEdge = true;
  }

  export function addPeerLink() {
    network.addEdgeMode();
    newLinkType = 'peer';
    // network.setOptions({ ...options, interaction: { hover: false } });
    addingEdge = true;
  }

  function addEdge2() {
    if (edgeType === 'peer') {
      callbackData.dashes = true;
      callbackData.width = 2;
      callbackData.arrows = 'to, from';
    }

    showConfirmAddEdgeModal = false;
    // callbackFunc = null;
    // callbackData = null;
    callbackFunc(callbackData);
  }

  function deleteNode() {
    if (selectedASN !== null) {
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

      // network.setData({ nodes, edges });
      selectedASN = null;
      selectedAS = null;
      selectedASLevel = null;
    }
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
      console.log('links in deleteEdge', cpLinks, peerLinks);
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
        color = { border: '#047857', background: '#34d399' };

        if (victimASN !== null && victimASN !== selectedASN) {
          nodes.update({ id: victimASN, role: null, color: null });
        }

        victimASN = selectedASN;
      } else if (selectedASRole === 'attacker') {
        color = { border: '#b91c1c', background: '#f87171' };
      } else {
        color = null;
      }
      nodes.update({ id: selectedASN, role: selectedASRole, color: color });
    }
  }

  function updateASPolicy() {
    if (selectedASN !== null) {
      let shape: string | null;
      if (
        selectedASPolicy.toLowerCase() === 'rov' ||
        selectedASPolicy.toLowerCase() === 'aspa' ||
        selectedASPolicy.toLowerCase() === 'bgpsec' ||
        selectedASPolicy.toLowerCase() === 'otc' ||
        selectedASPolicy.toLowerCase() === 'pathend'
      ) {
        shape = 'hexagon';
      } else {
        shape = null;
      }
      nodes.update({ id: selectedASN, policy: selectedASPolicy, shape: shape });
    }
  }

  function clearGraph() {
    nodes.clear();
    edges.clear();
  }

  function handleContextMenuAction(action: string) {
    if (action === 'deleteNode' && selectedASN2 !== null) {
      // Log before
      console.log('before delete node', edges, cpLinks, peerLinks);

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
      console.log('after delete node', edges, cpLinks, peerLinks);

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
      console.log('links in context menu', cpLinks, peerLinks);
      const levels = getPropagationRanks({ cp_links: cpLinks, peer_links: peerLinks });
      // console.log('levels in context menu', levels);
      nodes.forEach((node) => {
        // const prevLevel = node.level;
        nodes.update({ ...node, level: levels[node.id] || 1 });
      });
    }

    contextMenuData.show = false;
  }
</script>

<!-- <Modal bind:showModal on:close={() => (showModal = false)}>
  <div slot="header" class="text-sm font-medium leading-6 mb-2">Add AS</div>
  <input
    type="number"
    bind:value={newNodeId}
    placeholder="ASN"
    class="p-1 border border-gray-300 rounded"
  />
  <button on:click={addNode} class="bg-emerald-500 text-white p-2 rounded">Add</button>
</Modal> -->

<!-- Add AS Modal -->
<Dialog.Root bind:open={showModal}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Add AS</Dialog.Title>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-5 items-center gap-4">
        <Label class="text-right">AS Number</Label>
        <Input bind:value={newNodeId} class="col-span-4" />
      </div>

      <div class="grid grid-cols-5 items-center gap-4">
        <Label class="text-right">Policy</Label>
        <select
          bind:value={newASPolicy}
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-4"
        >
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
          bind:value={newASRole}
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-4"
        >
          <option value="">None</option>
          <option value="attacker">Attacker</option>
          <option value="victim">Victim</option>
        </select>
      </div>
    </div>
    <Dialog.Footer>
      <Button on:click={addNode} class="bg-emerald-500 hover:bg-emerald-500">Add</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Clear Graph Confirmation Modal -->
<AlertDialog.Root bind:open={showClearGraphModal}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you sure?</AlertDialog.Title>
      <AlertDialog.Description>
        Clearing the graph will remove all ASes and links. This cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action on:click={clearGraph} class="bg-destructive hover:bg-destructive/90">
        Continue
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- <Modal bind:showModal={showAddEdgeModal} on:close={() => (showAddEdgeModal = false)}>
  <div slot="header" class="text-sm font-medium leading-6 mb-2">Add Connection</div>

  <ul class="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200">
    <li class="me-2">
      <a
        href="#"
        class="inline-block p-4 rounded-t-lg {edgeType === 'customer-provider'
          ? 'text-blue-600 bg-gray-50'
          : 'hover:text-gray-600 hover:bg-gray-50'}"
        on:click|preventDefault={() => (edgeType = 'customer-provider')}>Customer-Provider</a
      >
    </li>
    <li class="me-2">
      <a
        href="#"
        class="inline-block p-4 rounded-t-lg {edgeType === 'peer'
          ? 'text-blue-600 bg-gray-50'
          : 'hover:text-gray-600 hover:bg-gray-50'}"
        on:click|preventDefault={() => (edgeType = 'peer')}>Peer</a
      >
    </li>
  </ul>

  {#if edgeType === 'customer-provider'}
    <input
      type="number"
      bind:value={newEdgeFrom}
      placeholder="From ASN"
      class="p-1 border border-gray-300 rounded"
    />
    <input
      type="number"
      bind:value={newEdgeTo}
      placeholder="To ASN"
      class="p-1 border border-gray-300 rounded"
    />
  {:else if edgeType === 'peer'}
    <input
      type="number"
      bind:value={newPeer1}
      placeholder="First Peer"
      class="p-1 border border-gray-300 rounded"
    />
    <input
      type="number"
      bind:value={newPeer2}
      placeholder="Second Peer"
      class="p-1 border border-gray-300 rounded"
    />
  {/if}

  <button on:click={addEdge} class="bg-emerald-500 text-white p-2 rounded">Add</button>
</Modal> -->

<!-- <Modal bind:showModal={showConfirmAddEdgeModal} on:close={() => (showConfirmAddEdgeModal = false)}>
  <div slot="header" class="text-sm font-medium leading-6 mb-2">Add Edge</div>
  <label>
    <input type="radio" value="customer-provider" bind:group={edgeType} />
    Customer-Provider
  </label>
  <label>
    <input type="radio" value="peer" bind:group={edgeType} />
    Peer-Peer
  </label>
  <button on:click={addEdge2} class="bg-emerald-500 text-white p-2 rounded">Save</button>
</Modal> -->

<h2 class="text-sm font-medium leading-6 mb-2">Graph</h2>

<!-- Action Button -->
{#if !USE_FILE_MENU}
  <div class="flex space-x-2">
    <Button
      on:click={() => (showModal = true)}
      class="bg-emerald-500 hover:bg-emerald-500/90"
      size="sm"
    >
      <!-- <Plus class="mr-2 h-4 w-4" /> -->
      Add AS
    </Button>
    <Button on:click={addCPLink} class="bg-emerald-500 hover:bg-emerald-500/90" size="sm">
      <!-- <Plus class="mr-2 h-4 w-4" /> -->
      Add Customer-Provider Link
    </Button>
    <Button on:click={addPeerLink} class="bg-emerald-500 hover:bg-emerald-500/90" size="sm">
      <!-- <Plus class="mr-2 h-4 w-4" /> -->
      Add Peer Link
    </Button>

    <!-- <button on:click={() => (showAddEdgeModal = true)} class="bg-emerald-500 text-white p-2 rounded"
  >Add Customer-Provider Link</button
>
<button on:click={() => (showAddEdgeModal = true)} class="bg-emerald-500 text-white p-2 rounded"
  >Add Peer-Peer Link</button
> -->
    <!-- <Button on:click={clearGraph} variant="destructive"> -->
    <Button on:click={() => (showClearGraphModal = true)} variant="destructive" size="sm">
      <Ban class="mr-2 size-4" />
      Clear Graph
    </Button>
  </div>
{/if}

<!-- Graph -->
<div bind:this={container} class="mt-2 w-full" style="height: 35rem"></div>

{#if selectedASN !== null}
  <div class="space-y-2">
    <p>Selected ASN: {selectedASN}</p>
    <p>
      Level:
      <input
        type="number"
        bind:value={selectedASLevel}
        class="p-1 border border-gray-300 rounded"
        min="1"
        on:keydown={() => false}
      />
    </p>
    <p>
      AS Role:
      <select
        bind:value={selectedASRole}
        on:change={updateASRole}
        class="p-1 border border-gray-300 rounded"
      >
        <option value="">None</option>
        <option value="attacker">Attacker</option>
        <option value="victim">Victim</option>
      </select>
    </p>
    <p>
      AS Policy:
      <select
        bind:value={selectedASPolicy}
        on:change={updateASPolicy}
        class="p-1 border border-gray-300 rounded"
      >
        <option value="bgp">BGP</option>
        <option value="rov">ROV</option>
        <option value="aspa">ASPA</option>
        <option value="bgpsec">BGPSec</option>
        <option value="otc">Only to Customers</option>
        <option value="pathend">Pathend</option>
      </select>
    </p>

    <button on:click={deleteNode} class="bg-red-500 text-white p-2 rounded">Delete AS</button>
  </div>
{/if}

{#if selectedLinkID !== null}
  <div class="space-y-2">
    <p>Selected Link: {selectedLink.from}, {selectedLink.to}</p>
    <button on:click={deleteEdge} class="bg-red-500 text-white p-2 rounded">Delete Link</button>
  </div>
{/if}

{#if nodeData}
  <div class="tooltip" style="left: {nodeData.x}px; top: {nodeData.y}px;">
    <p class="mb-2">{nodeData.policy.toUpperCase()}</p>
    {#if simulationResults !== null && simulationResults.local_ribs[nodeData.id]}
      {#if simulationResults.local_ribs[nodeData.id].length > 0}
        <table border="0" cellpadding="4" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td colspan="4">Local RIB</td>
          </tr>
          {#each simulationResults.local_ribs[nodeData.id] as { type, mask, as_path }}
            <tr>
              <td>{mask}</td>
              <td>{as_path.join(', ')}</td>
              <td>
                {#if type === 'victim'}
                  &#128519;
                {:else if type === 'attacker'}
                  &#128520;
                {/if}
              </td>
            </tr>
          {/each}
        </table>
      {:else}
        <p>Disconnected</p>
      {/if}
    {/if}
  </div>
{/if}

{#if contextMenuData.show}
  <div class="context-menu" style="left: {contextMenuData.x}px; top: {contextMenuData.y}px;">
    <ul>
      {#if selectedASN2 !== null}
        <li on:click={() => handleContextMenuAction('deleteNode')}>Delete Node</li>
      {/if}
      {#if selectedLinkID2 !== null}
        <li on:click={() => handleContextMenuAction('deleteEdge')}>Delete Edge</li>
      {/if}
    </ul>
  </div>
{/if}

<!-- <ContextMenu.Root bind:open={rightClick}>
  <ContextMenu.Trigger >Test</ContextMenu.Trigger>
  <ContextMenu.Content>
    {#if selectedASN2 !== null}
      <ContextMenu.Item on:click={() => handleContextMenuAction('deleteNode')}
        >Delete Node</ContextMenu.Item
      >
    {/if}
    {#if selectedLinkID2 !== null}
      <ContextMenu.Item on:click={() => handleContextMenuAction('deleteEdge')}
        >Delete Edge</ContextMenu.Item
      >
    {/if}
  </ContextMenu.Content>
</ContextMenu.Root> -->

<style>
  .context-menu {
    position: absolute;
    z-index: 200;
    border: 1px solid #ccc;
    background-color: #fff;
    padding: 5px;
    border-radius: 5px;
    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    padding: 5px 10px;
    cursor: pointer;
  }
  li:hover {
    background-color: #f0f0f0;
  }

  .tooltip {
    position: absolute;
    z-index: 100;
    border: 1px solid #ccc;
    background-color: #fff;
    padding: 10px;
    border-radius: 5px;
    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
  }
  table {
    border: 1px solid black;
  }
  td {
    border: 1px solid black;
  }
</style>