<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Tabs from '$lib/components/ui/tabs';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import type { DataSet, Edge, Node } from 'vis-network/standalone';
  import { LinkType, type Config } from '$lib/types';
  import { toast } from 'svelte-sonner';
  import { updatePropRanks } from '$lib/utils/as';
  import { createCPEdge, createPeerEdge, getEdgeByFromTo } from '$lib/utils/link';

  export let showModal: boolean;
  export let nodes: DataSet<Node>;
  export let edges: DataSet<Edge>;
  export let config: Config;
  export let refreshSelectedAS: () => void;

  let newLinkFrom: number | null = null;
  let newLinkTo: number | null = null;
  let newPeer1: number | null = null;
  let newPeer2: number | null = null;
  let edgeType: LinkType = LinkType.CustomerProvider;

  function addLink() {
    if (edgeType === LinkType.CustomerProvider) {
      if (!newLinkFrom || !newLinkTo) {
        toast.error('From and To ASes must be defined');
        return;
      }

      // We need to do this for some reason
      newLinkFrom = Number(newLinkFrom);
      newLinkTo = Number(newLinkTo);

      // Check if link already exists
      if (
        getEdgeByFromTo(newLinkFrom, newLinkTo, edges) !== null ||
        getEdgeByFromTo(newLinkTo, newLinkFrom, edges) !== null
      ) {
        toast.error(`Link between ${newLinkFrom} and ${newLinkTo} already exists`);
        return;
      }

      // Ensure ASes exist
      if (nodes.get([newLinkFrom, newLinkTo]).length !== 2) {
        toast.error('Cannot create a link between ASes that do not exist');
        return;
      }

      // Add edge to graph
      edges.add(createCPEdge(newLinkFrom, newLinkTo));

      // Add link to config
      config.graph.cp_links = [...config.graph.cp_links, [Number(newLinkFrom), Number(newLinkTo)]];
    } else if (edgeType === LinkType.PeerToPeer) {
      if (!newPeer1 || !newPeer2) {
        toast.error('Both peer ASes must be defined');
        return;
      }

      // We need to do this for some reason
      newPeer1 = Number(newPeer1);
      newPeer2 = Number(newPeer2);

      // Check if link already exists
      if (
        getEdgeByFromTo(newPeer1, newPeer2, edges) !== null ||
        getEdgeByFromTo(newPeer2, newPeer1, edges) !== null
      ) {
        toast.error(`Peer-to-Peer link between ${newLinkFrom} and ${newLinkTo} already exists`);
        return;
      }

      // Ensure ASes exist
      if (nodes.get([newPeer1, newPeer2]).length !== 2) {
        toast.error('Cannot create a link between ASes that do not exist');
        return;
      }

      // Add edge to graph
      edges.add(createPeerEdge(newPeer1, newPeer2));

      // Add peer link to config
      config.graph.peer_links = [...config.graph.peer_links, [Number(newPeer1), Number(newPeer2)]];
    }

    // Reset inputs
    newPeer1 = null;
    newPeer2 = null;
    showModal = false; // Close modal

    // Adjust height of graph
    updatePropRanks(nodes, config);

    // If we added an edge to the selected AS, reselect it so that it shows up on the details card
    refreshSelectedAS();
  }
</script>

<Dialog.Root bind:open={showModal}>
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
        <Tabs.Trigger value={LinkType.CustomerProvider}>Customer-Provider</Tabs.Trigger>
        <Tabs.Trigger value={LinkType.PeerToPeer}>Peer-to-Peer</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value={LinkType.CustomerProvider}>
        <div class="grid grid-cols-2 gap-2">
          <Input type="number" bind:value={newLinkFrom} placeholder="From AS" class="col-span-1" />
          <Input type="number" bind:value={newLinkTo} placeholder="To AS" />
        </div>
      </Tabs.Content>

      <Tabs.Content value={LinkType.PeerToPeer}>
        <div class="grid grid-cols-2 gap-2">
          <Input
            type="number"
            bind:value={newPeer1}
            placeholder="First Peer AS"
            class="col-span-1" />
          <Input type="number" bind:value={newPeer2} placeholder="Second Peer AS" />
        </div>
      </Tabs.Content>
    </Tabs.Root>

    <Dialog.Footer>
      <Button on:click={addLink} class="bg-emerald-500 hover:bg-emerald-500">Add</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
