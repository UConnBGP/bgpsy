<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Network, DataSet, type Options, type Node } from 'vis-network/standalone';
  import Ban from 'lucide-svelte/icons/ban';
  import { getPropagationRanks } from '$lib';
  import * as Dialog from './ui/dialog';
  import * as AlertDialog from './ui/alert-dialog';
  import { Input } from './ui/input';
  import { Label } from './ui/label';
  import Button from './ui/button/button.svelte';
  import * as Popover from './ui/popover';
  import Info from 'lucide-svelte/icons/info';
  import * as Tabs from '$lib/components/ui/tabs';
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
  import { toast } from 'svelte-sonner';

  export let nodes: DataSet<{}>;
  export let edges: DataSet<{}>;
  export let simulationResults: {} | null;
  export let cpLinks: number[][];
  export let peerLinks: number[][];
  export let policyMap: Record<number, string>;
  export let roleMap: Record<number, string>;
  export let imageURL: string;
  export let graphLoadingState: string;

  let container: HTMLDivElement;
  let network: Network;
  let selectedAS: any | null = null;
  let selectedASN: number | null = null;
  let selectedASLevel: any | null = null;
  let selectedASRole: any | null = null;
  let selectedASPolicy: any | null = null;
  let selectedLink: any | null = null;
  let selectedLinkID: string | null = null;
  let selectedASN2: any | null = null;
  let selectedLinkID2: string | null = null;
  let showModal = false;
  let showClearGraphModal = false;
  let showAddEdgeModal = false;
  let showRenameASModal = false;
  let showLegend = false;
  let newNodeId: number | string;
  let renamedASN: number;
  let newASPolicy = 'bgp';
  let newASRole = '';
  let newEdgeFrom: number | string;
  let newEdgeTo: number | string;
  let newPeer1: number | string;
  let newPeer2: number | string;
  let edgeType = 'cp'; // Default edge type
  let callbackFunc;
  let callbackData;
  let nodeData: {} | null = null;
  let edgeData: {} | null = null;
  let contextMenuData = { show: false, x: 0, y: 0 };
  let victimASN: any | null = null;
  let newLinkType: string | null = null;
  let addingEdge = false;
  let addingCPLink = false;
  let addingPeerLink = false;
  let rightClick = false;
  let newASCustomers: any[] = [];
  let newASProviders = Array<any>();
  let newASPeers: any[] = [];
  let selectedASRelationships = {
    customers: Array<number | null>(),
    providers: Array<number | null>(),
    peers: Array<number | null>()
  };
  let addASErrorMsg = '';
  let options: Options = {
    // Configuration for vis-network
    // configure: true,
    nodes: {
      shape: 'custom',
      size: 30,
      font: {
        size: 20
      },
      borderWidth: 2,
      // color: {
      //   background: '#38bdf8'
      // },

      ctxRenderer: function ({ ctx, id, x, y, state: { selected, hover }, style, label }) {
        ctx.save();

        // console.log(`Rendering ${label}`);

        // Define the data for the Local RIB
        const header = ['Local RIB'];
        let rows = [];
        if (simulationResults && simulationResults.local_ribs[label]) {
          rows = simulationResults.local_ribs[label].map(({ type, mask, as_path }) => {
            return [mask, as_path.join(', '), type === 'attacker' ? '😈' : '😇'];
          });
        }

        // Font for the Local RIB
        const fontSize = 14;
        ctx.font = `${fontSize}px Inter`;

        // Find the max width for each column
        let maxWidths = [0, 0, 0];
        for (let i = 0; i < rows.length; i++) {
          let width = ctx.measureText(rows[i][0]).width + 5;
          maxWidths[0] = Math.max(maxWidths[0], width);

          width = ctx.measureText(rows[i][1]).width + 5;
          maxWidths[1] = Math.max(maxWidths[1], width);

          width = ctx.measureText(rows[i][2]).width + 5;
          maxWidths[2] = Math.max(maxWidths[2], width);
        }

        // Get AS policy
        let nodePolicy = 'BGP';
        if (id in policyMap) {
          nodePolicy = policyMap[id].toLowerCase();

          // TODO: Refactor
          // Format policy
          if (
            nodePolicy === 'bgp' ||
            nodePolicy === 'rov' ||
            nodePolicy === 'aspa' ||
            nodePolicy === 'otc'
          ) {
            nodePolicy = nodePolicy.toUpperCase();
          } else if (nodePolicy === 'pathend') {
            nodePolicy = 'Pathend';
          } else if (nodePolicy === 'bgpsec') {
            nodePolicy = 'BGPSec';
          }
        }

        // const cellWidth = maxTextWidth + 0; // Width of each cell
        const cellHeight = fontSize + 10; // Height of each cell
        const tableWidth = maxWidths.reduce((sum, a) => sum + a, 0); // Total table width cellWidth * 3
        const tableHeight = cellHeight * (rows.length + 1); // Total table height
        const minR = nodePolicy === 'Pathend' || nodePolicy === 'BGPSec' ? 35 : 30;
        const r = Math.max(minR, tableWidth / 1.6); // Radius of the circle

        // Clear previous path
        ctx.beginPath();

        if (nodePolicy === 'BGP') {
          // Draw a circle
          ctx.arc(x, y, r, 0, 2 * Math.PI, false);
        } else {
          // Draw an octagon
          const angle = (2 * Math.PI) / 8; // Octagon angle
          ctx.moveTo(x + r * Math.cos(0), y + r * Math.sin(0));
          for (let i = 1; i < 8; i++) {
            ctx.lineTo(x + r * Math.cos(angle * i), y + r * Math.sin(angle * i));
          }
          ctx.closePath();
        }

        // Style for shape
        ctx.fillStyle = style.color;
        ctx.fill();
        ctx.strokeStyle = '#003366'; // Dark blue border
        ctx.lineWidth = selected || hover ? 4 : 2;
        ctx.stroke();

        // Draw the node value inside the circle at the top
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (
          simulationResults &&
          simulationResults.local_ribs[label] &&
          simulationResults.local_ribs[label].length > 0
        ) {
          ctx.fillText(label, x, y - tableHeight / 1.5);
          ctx.fillText(nodePolicy, x, y - tableHeight / 2.75);
        } else {
          ctx.fillText(label, x, y - tableHeight / 2);
          ctx.fillText(nodePolicy, x, y + tableHeight / 2);
        }

        // Draw the table
        const startX = x - tableWidth / 2;
        const startY = y - tableHeight / 2;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        // Draw header
        ctx.fillStyle = 'black';

        // Draw rows
        for (let i = 0; i < rows.length; i++) {
          let prevWidth = startX;
          for (let j = 0; j < rows[i].length; j++) {
            const cell = rows[i][j];
            // const width = cellWidth;
            // const width = ctx.measureText(cell).width + 5;
            const width = maxWidths[j];
            // const cellX = startX + j * width;
            const cellX = prevWidth;
            const cellY = startY + (i + 1) * cellHeight;
            // ctx.fillStyle = 'white';
            // ctx.fillRect(cellX, cellY, width, cellHeight);
            ctx.strokeRect(cellX, cellY, width, cellHeight);
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cell, cellX + width / 2, cellY + cellHeight / 2);
            prevWidth += width;
          }
        }

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
      addEdge: (data, callback) => {
        // Prevent adding edge to same node
        if (data.to === data.from) {
          newLinkType = null;
          network.disableEditMode();
          addingEdge = false;
          addingCPLink = false;
          addingPeerLink = false;
          return;
        }

        // TODO: Prevent adding duplicate edge

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
        // console.log('levels', levels);
        nodes.forEach((node) => {
          nodes.update({ ...node, level: levels[node.id] || 1 });
        });
        // And disable edit mode
        network.disableEditMode();
        // Re-enable hover
        // network.setOptions({ ...options, interaction: { hover: true } });
        addingEdge = false;
        addingCPLink = false;
        addingPeerLink = false;
      }
    },
    interaction: { hover: true, zoomSpeed: 0.7, zoomView: false },
    physics: false
  };

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
        selectedASLevel = selectedAS.level;
        selectedASRole = selectedAS.role || ''; // Get the role of the selected node
        selectedASPolicy = selectedAS.policy || 'bgp';
        selectedASRelationships = getRelationships(selectedASN);
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

  $: if (simulationResults && network) {
    showLegend = true;
    network.fit({ animation: { duration: 200, easingFunction: 'linear' } });
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

  function addNode() {
    if (!newNodeId) {
      addASErrorMsg = 'AS Number is not entered';
      toast.error(addASErrorMsg);
      return;
    }

    // Error if AS is negative
    if (newNodeId < 0) {
      addASErrorMsg = 'AS Number cannot be negative';
      toast.error(addASErrorMsg);
      return;
    }

    // Error if AS already exists
    if (nodes.get(Number(newNodeId))) {
      addASErrorMsg = `AS ${newNodeId} already exists`;
      toast.error(addASErrorMsg);
      return;
    }

    const newNode = {
      id: Number(newNodeId),
      label: String(newNodeId),
      level: 1
    };

    // TODO: Refactor
    // This code is really, really bad
    if (
      newASPolicy.toLowerCase() === 'rov' ||
      newASPolicy.toLowerCase() === 'aspa' ||
      newASPolicy.toLowerCase() === 'bgpsec' ||
      newASPolicy.toLowerCase() === 'otc' ||
      newASPolicy.toLowerCase() === 'pathend'
    ) {
      policyMap[Number(newNodeId)] = newASPolicy;
      // console.log(policyMap[Number(newNodeId)]);
    }

    newNode.policy = newASPolicy;
    // newNode.shape = shape;

    if (newASRole === 'victim') {
      const colorProp = { border: '#047857', background: '#34d399' };
      newNode.color = { ...colorProp, highlight: colorProp, hover: colorProp };
      newNode.role = newASRole;
      roleMap[Number(newNodeId)] = 'victim';
    } else if (newASRole === 'attacker') {
      const colorProp = { border: '#b91c1c', background: '#f87171' };
      newNode.color = { ...colorProp, highlight: colorProp, hover: colorProp };
      newNode.role = newASRole;
      roleMap[Number(newNodeId)] = 'attacker';
    }

    // Add node
    nodes.add(newNode);

    // Set edges
    for (const customer of newASCustomers) {
      if (customer === null) {
        continue;
      }
      const newEdge = {
        from: Number(newNodeId),
        to: Number(customer),
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8
          }
        }
      };
      // console.log('customer:', newEdge);
      edges.add(newEdge);
      cpLinks = [...cpLinks, [Number(newNodeId), Number(customer)]];
    }

    for (const provider of newASProviders) {
      if (provider === null) {
        continue;
      }
      const newEdge = {
        from: Number(provider),
        to: Number(newNodeId),
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8
          }
        }
      };
      // console.log('provider:', newEdge);
      edges.add(newEdge);
      cpLinks = [...cpLinks, [Number(provider), Number(newNodeId)]];
    }

    for (const peer of newASPeers) {
      if (peer === null) {
        continue;
      }
      const newEdge = {
        from: Number(newNodeId),
        to: Number(peer),
        dashes: true,
        width: 2,
        arrows: 'to, from'
      };
      // console.log('peer:', newEdge);
      edges.add(newEdge);
      peerLinks = [...peerLinks, [Number(newNodeId), Number(peer)]];
    }

    console.log('nodes after adding node:', nodes.get());
    console.log('edges after adding node:', edges.get());

    // Since graph is changed, clear out simulation results
    // simulationResults = null;
    // imageURL = null;
    // for (const node of nodes.get()) {
    //   if (policyMap[Number(node.id)]) {
    //     node.color = null;
    //   }
    // }

    // Refresh graph
    network.setData({ nodes, edges });

    // Adjust height of graph
    const levels = getPropagationRanks({ cp_links: cpLinks, peer_links: peerLinks });
    nodes.forEach((node) => {
      nodes.update({ ...node, level: levels[node.id] || 1 });
    });

    // Reset input
    newNodeId = '';
    newASPolicy = 'bgp';
    newASRole = '';
    newASCustomers = [];
    newASProviders = [];
    newASPeers = [];
    addASErrorMsg = '';

    showModal = false; // Close modal
  }

  function addEdge() {
    if (edgeType === 'cp' && newEdgeFrom && newEdgeTo) {
      // Customer-provider edge logic
      const newEdge = {
        from: Number(newEdgeFrom),
        to: Number(newEdgeTo),
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8
          }
        }
      };
      edges.add(newEdge);
      network.setData({ nodes, edges });

      cpLinks = [...cpLinks, [Number(newEdgeFrom), Number(newEdgeTo)]];
      newEdgeFrom = '';
      newEdgeTo = ''; // Reset inputs
      showAddEdgeModal = false; // Close modal
    } else if (edgeType === 'peer' && newPeer1 && newPeer2) {
      // peer-to-peer edge logic
      const newEdge = {
        from: Number(newPeer1),
        to: Number(newPeer2),
        dashes: true,
        width: 2,
        arrows: 'to, from'
      };
      edges.add(newEdge);
      network.setData({ nodes, edges });

      peerLinks = [...peerLinks, [Number(newPeer1), Number(newPeer2)]];
      newPeer1 = '';
      newPeer2 = ''; // Reset inputs
      showAddEdgeModal = false; // Close modal
    } else {
      return;
    }

    // Adjust height of graph
    const levels = getPropagationRanks({ cp_links: cpLinks, peer_links: peerLinks });
    nodes.forEach((node) => {
      nodes.update({ ...node, level: levels[node.id] || 1 });
    });
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

    // network.setOptions({ ...options, interaction: { hover: false } });

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

    // network.setOptions({ ...options, interaction: { hover: false } });

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
      console.log(roleMap);
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
        // shape = 'hexagon';
        policyMap[selectedASN] = selectedASPolicy;
      } else {
        delete policyMap[selectedASN];
      }
      // console.log(policyMap);
      nodes.update({ id: selectedASN, policy: selectedASPolicy });
      // network.setData({ nodes, edges });
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
    simulationResults = null;
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

  function getRelationships(asn) {
    let customers = [];
    let providers = [];
    let peers = [];

    edges.forEach((edge) => {
      if (edge.from === asn) {
        if (edge.arrows && edge.arrows.to) {
          customers.push(edge.to);
        } else if (edge.dashes) {
          peers.push(edge.to);
        }
      } else if (edge.to === asn) {
        if (edge.arrows && edge.arrows.to) {
          providers.push(edge.from);
        } else if (edge.dashes) {
          peers.push(edge.from);
        }
      }
    });

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

  function renameAS(oldASN, newASN) {
    // Number already used
    if (nodes.get({ filter: (node) => node.id === newASN }).length > 0) {
      return;
    }

    // Update the node's ID and label
    const nodeToUpdate = nodes.get(oldASN);
    if (!nodeToUpdate) {
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

    // Update cpLinks and peerLinks if necessary
    cpLinks = cpLinks.map((link) => link.map((id) => (id === oldASN ? newASN : id)));
    peerLinks = peerLinks.map((link) => link.map((id) => (id === oldASN ? newASN : id)));

    // Adjust height of graph
    const levels = getPropagationRanks({ cp_links: cpLinks, peer_links: peerLinks });
    nodes.forEach((node) => {
      nodes.update({ ...node, level: levels[node.id] || 1 });
    });

    // Dismiss modal
    showRenameASModal = false;

    // Should I change selectedASN(2)?
  }
</script>

<!-- Add AS Modal -->
<Dialog.Root bind:open={showModal}>
  <Dialog.Content class="max-w-3xl left-[9%] top-[5%] translate-x-[-9%] translate-y-[-5%]">
    <Dialog.Header>
      <Dialog.Title>Add AS</Dialog.Title>
      <Dialog.Description>
        Create a new AS. Specify an AS's policy and role (i.e., victim or attacker) as well as its
        relationships to other ASes in the graph.
      </Dialog.Description>
    </Dialog.Header>
    <div>
      <div class="grid gap-4 py-4">
        <!-- <ErrorBanner message={addASErrorMsg} open={addASErrorMsg !== ''} /> -->

        <div class="grid grid-cols-5 items-center gap-4">
          <Label class="text-right">AS Number</Label>
          <Input bind:value={newNodeId} class="col-span-4" type="number" />
        </div>

        <div class="grid grid-cols-5 items-center gap-4">
          <Label class="text-right">Policy</Label>
          <select
            bind:value={newASPolicy}
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
            bind:value={newASRole}
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
              on:click={() => (newASProviders = [...newASProviders, null])}>
              <Plus class="size-4" />
            </Button>
          </div>
          <div class="space-y-2">
            {#each newASProviders as provider, index}
              <div class="grid grid-cols-4 gap-2">
                <select
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-3"
                  bind:value={newASProviders[index]}>
                  <option value={null}>Select an AS</option>
                  {#each availableNodes(newASProviders, index) as node}
                    <option value={node.id}>{node.label || node.id}</option>
                  {/each}
                </select>

                <Button
                  size="icon"
                  variant="outline"
                  class="col-span-1"
                  on:click={() => {
                    newASProviders.splice(index, 1);
                    newASProviders = newASProviders;
                  }}>
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
              on:click={() => (newASCustomers = [...newASCustomers, null])}>
              <Plus class="size-4" />
            </Button>
          </div>
          <div class="space-y-2">
            {#each newASCustomers as customer, index}
              <div class="grid grid-cols-4 gap-2">
                <select
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-3"
                  bind:value={newASCustomers[index]}>
                  <option value={null}>Select an AS</option>
                  {#each availableNodes(newASCustomers, index) as node}
                    <option value={node.id}>{node.label || node.id}</option>
                  {/each}
                </select>

                <Button
                  size="icon"
                  variant="outline"
                  class="col-span-1"
                  on:click={() => {
                    newASCustomers.splice(index, 1);
                    newASCustomers = newASCustomers;
                  }}>
                  <Trash2 class="size-4" />
                </Button>
              </div>
            {/each}
          </div>
        </div>
        <!-- <Card.Root>
          <Card.Header>
            <Card.Title>Customers</Card.Title>
          </Card.Header>
          <Card.Content>Test</Card.Content>
        </Card.Root> -->

        <!-- Peers Column -->
        <div class="border p-4 rounded-lg">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-md font-medium">Peers</h2>
            <Button
              size="icon"
              variant="outline"
              class="size-7"
              on:click={() => (newASPeers = [...newASPeers, null])}>
              <Plus class="size-4" />
            </Button>
          </div>
          <div class="space-y-2">
            {#each newASPeers as peer, index}
              <div class="grid grid-cols-4 gap-2">
                <select
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-3"
                  bind:value={newASPeers[index]}>
                  <option value={null}>Select an AS</option>
                  {#each availableNodes(newASPeers, index) as node}
                    <option value={node.id}>{node.label || node.id}</option>
                  {/each}
                </select>

                <Button
                  size="icon"
                  variant="outline"
                  class="col-span-1"
                  on:click={() => {
                    newASPeers.splice(index, 1);
                    newASPeers = newASPeers;
                  }}>
                  <Trash2 class="size-4" />
                </Button>
              </div>
            {/each}
          </div>
        </div>
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

<!-- Add Link Modal -->
<Dialog.Root bind:open={showAddEdgeModal}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Add Link</Dialog.Title>
      <Dialog.Description>
        Links can also be created by selecting the type in the toolbar and dragging a connection
        between two nodes.
      </Dialog.Description>
    </Dialog.Header>

    <Tabs.Root bind:value={edgeType} class="w-full">
      <Tabs.List class="grid w-full grid-cols-2">
        <Tabs.Trigger value="cp">Customer-Provider</Tabs.Trigger>
        <Tabs.Trigger value="peer">Peer-to-Peer</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="cp">
        <div class="grid grid-cols-2 gap-2">
          <Input type="number" bind:value={newEdgeFrom} placeholder="From ASN" class="col-span-1" />
          <Input type="number" bind:value={newEdgeTo} placeholder="To ASN" />
        </div>
      </Tabs.Content>

      <Tabs.Content value="peer">
        <div class="grid grid-cols-2 gap-2">
          <Input type="number" bind:value={newPeer1} placeholder="First Peer" class="col-span-1" />
          <Input type="number" bind:value={newPeer2} placeholder="Second Peer" />
        </div>
      </Tabs.Content>
    </Tabs.Root>

    <Dialog.Footer>
      <Button on:click={addEdge} class="bg-emerald-500 hover:bg-emerald-500">Add</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Change AS Number Modal -->
<Dialog.Root bind:open={showRenameASModal}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Rename AS {selectedASN2}</Dialog.Title>
    </Dialog.Header>

    <div class="grid grid-cols-5 items-center gap-4">
      <Label class="text-right">AS Number</Label>
      <Input bind:value={renamedASN} class="col-span-4" type="number" />
    </div>

    <Dialog.Footer>
      <Button
        on:click={() => {
          renameAS(selectedASN2, Number(renamedASN));
        }}>Change ASN</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- <h2 class="text-sm font-medium leading-6 mb-2">Graph</h2> -->

<!-- Action Button -->
<div class="flex space-x-2">
  <Button
    on:click={() => (showModal = true)}
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

  {#if simulationResults}
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
                <td class="bg-gradient-to-r from-red-500 to-white border border-black">
                  &#128520; ATTACKER SUCCESS &#128520;
                </td>
                <td class="px-4 border border-black"
                  >{countByValue(simulationResults.outcome, 0)}</td>
              </tr>
              <tr>
                <td class="bg-gradient-to-r from-green-400 to-white border border-black">
                  &#128519; VICTIM SUCCESS &#128519;
                </td>
                <td class="px-4 border border-black"
                  >{countByValue(simulationResults.outcome, 1)}</td>
              </tr>
              <tr>
                <td class="bg-gradient-to-r from-gray-400 to-white border border-black">
                  &#10041; DISCONNECTED &#10041;
                </td>
                <td class="px-4 border border-black"
                  >{countByValue(simulationResults.outcome, 2)}</td>
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
          renamedASN = selectedASN2;
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
          showModal = true;
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

<style>
</style>
