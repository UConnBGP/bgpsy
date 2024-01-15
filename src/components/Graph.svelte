<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Network, DataSet } from 'vis-network/standalone/esm/vis-network';
  import Modal from './Modal.svelte';

  export let nodes: DataSet<{}>;
  export let edges: DataSet<{}>;

  // onMount(() => {
  //   // Nodes and edges data
  //   const nodes = [
  //     { id: 1, label: '1', x: 0, y: -200, fixed: true },
  //     { id: 2, label: '2', x: 0, y: 0, fixed: true },
  //     { id: 3, label: '3', x: 200, y: 0, fixed: true },
  //     { id: 777, label: '777', x: -50, y: 200, fixed: true },
  //     { id: 666, label: '666', x: 300, y: 200, fixed: true }
  //   ];

  //   const edges = [
  //     { from: 1, to: 2 },
  //     { from: 2, to: 3 },
  //     { from: 2, to: 777 },
  //     { from: 3, to: 666 }
  //   ];

  //   // Options for the network
  //   const options = {
  //     nodes: {
  //       shape: 'dot',
  //       size: 30,
  //       font: {
  //         size: 32
  //       },
  //       borderWidth: 2
  //     },
  //     edges: {
  //       width: 2
  //     }
  //     //   physics: {
  //     //     forceAtlas2Based: {
  //     //       gravitationalConstant: -26,
  //     //       centralGravity: 0.005,
  //     //       springLength: 230,
  //     //       springConstant: 0.18
  //     //     },
  //     //     maxVelocity: 146,
  //     //     solver: 'forceAtlas2Based',
  //     //     timestep: 0.35,
  //     //     stabilization: { iterations: 150 }
  //     //   }
  //   };

  //   // Initialize network
  //   const container = document.getElementById('mynetwork');
  //   new Network(container, { nodes, edges }, options);
  // });

  let container;
  let network;
  // let nodes;
  // let edges;
  let options;
  let nextNodeId = 778;
  let selectedAS = null;
  let selectedASN = null;
  let selectedASLevel = null;
  let selectedASRole = null;
  let selectedASPolicy = null;
  let selectedLink = null;
  let selectedLinkID = null;
  let showModal = false;
  let showAddEdgeModal = false;
  let newNodeId;
  let newEdgeFrom;
  let newEdgeTo;
  let newPeer1;
  let newPeer2;
  let edgeType = 'consumer-producer'; // Default edge type

  onMount(() => {
    // Configuration for the network
    options = {
      nodes: {
        shape: 'dot',
        size: 30,
        font: {
          size: 20
        },
        borderWidth: 2
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
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8
          }
        }
      },
      physics: false // Disable physics for hierarchical layout
    };

    // Initialize network
    // const container = document.getElementById('mynetwork');
    network = new Network(container, { nodes, edges }, options);

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
    });

    network.on('deselectNode', () => {
      selectedASN = null;
      selectedAS = null;
      selectedASLevel = null;
    });

    network.on('deselectEdge', () => {
      selectedLinkID = null;
    });

    // nodes.on('add', (event, properties, senderId) => {
    //   console.log('add node');
    //   network.setData({ nodes, edges });
    // });
    // nodes.on('remove', (event, properties, senderId) => {
    //   console.log('delete node');
    //   network.setData({ nodes, edges });
    // });
  });

  onDestroy(() => {
    if (network) {
      network.destroy();
    }
  });

  $: if (selectedAS && selectedASLevel !== selectedAS.level) {
    selectedAS = { ...selectedAS, level: selectedASLevel };
    nodes.update(selectedAS);
    // network.setData({ nodes, edges });
  }

  function addNode() {
    if (newNodeId) {
      const newNode = {
        id: newNodeId,
        label: String(newNodeId),
        level: 1 // You can set the level as needed
      };
      nodes.add(newNode);
      network.setData({ nodes, edges });
      newNodeId = ''; // Reset input
      showModal = false; // Close modal
    }
  }

  function addEdge() {
    if (edgeType === 'consumer-producer' && newEdgeFrom && newEdgeTo) {
      // Consumer-producer edge logic
      const newEdge = {
        from: newEdgeFrom,
        to: newEdgeTo
      };
      edges.add(newEdge);
      network.setData({ nodes, edges });
      newEdgeFrom = '';
      newEdgeTo = ''; // Reset inputs
      showAddEdgeModal = false; // Close modal
    } else if (edgeType === 'peer' && newPeer1 && newPeer2) {
      // peer-to-peer edge logic
      const newEdge = {
        from: newPeer1,
        to: newPeer2,
        dashes: true,
        width: 2
      };
      edges.add(newEdge);
      network.setData({ nodes, edges });
      newEdgeFrom = '';
      newEdgeTo = ''; // Reset inputs
      showAddEdgeModal = false; // Close modal
    }
  }

  function deleteNode() {
    if (selectedASN !== null) {
      nodes.remove(selectedASN);
      // network.setData({ nodes, edges });
      selectedASN = null;
      selectedAS = null;
      selectedASLevel = null;
    }
  }

  function deleteEdge() {
    if (selectedLinkID !== null) {
      edges.remove(selectedLinkID);
      // network.setData({ nodes, edges });
      selectedLinkID = null;
      selectedLink = null;
    }
  }

  function updateASRole() {
    if (selectedASN !== null) {
      let color: {} | null;
      if (selectedASRole === 'victim') {
        color = { border: '#16a34a', background: '#86efac' };
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
      if (selectedASPolicy.toLowerCase() === 'rov') {
        shape = 'square';
      } else {
        shape = null;
      }
      nodes.update({ id: selectedASN, policy: selectedASPolicy, shape: shape });
    }
  }
</script>

<Modal bind:showModal on:close={() => (showModal = false)}>
  <div slot="header" class="text-sm font-medium leading-6 mb-2">Add AS</div>
  <input
    type="number"
    bind:value={newNodeId}
    placeholder="ASN"
    class="p-1 border border-gray-300 rounded"
  />
  <button on:click={addNode} class="bg-emerald-500 text-white p-2 rounded">Add</button>
</Modal>

<Modal bind:showModal={showAddEdgeModal} on:close={() => (showAddEdgeModal = false)}>
  <div slot="header" class="text-sm font-medium leading-6 mb-2">Add Connection</div>

  <ul class="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200">
    <li class="me-2">
      <a
        href="#"
        class="inline-block p-4 rounded-t-lg {edgeType === 'consumer-producer'
          ? 'text-blue-600 bg-gray-50'
          : 'hover:text-gray-600 hover:bg-gray-50'}"
        on:click|preventDefault={() => (edgeType = 'consumer-producer')}>Consumer-Producer</a
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

  {#if edgeType === 'consumer-producer'}
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
</Modal>

<h2 class="text-sm font-medium leading-6 mb-2">Graph</h2>
<button on:click={() => (showModal = true)} class="bg-emerald-500 text-white p-2 rounded"
  >Add AS</button
>
<button on:click={() => (showAddEdgeModal = true)} class="bg-emerald-500 text-white p-2 rounded"
  >Add Link</button
>
<div bind:this={container} class="w-full" style="height: 31.5rem"></div>

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
