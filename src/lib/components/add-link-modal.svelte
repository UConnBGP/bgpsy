<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Tabs from '$lib/components/ui/tabs';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import type { DataSet, Edge, Node } from 'vis-network/standalone';
  import { LinkType, type Config } from '$lib/types';
  import { toast } from 'svelte-sonner';
  import { getPropagationRanks } from '$lib/utils';

  export let showModal: boolean;
  export let nodes: DataSet<Node>;
  export let edges: DataSet<Edge>;
  export let config: Config;

  let newEdgeFrom: number | null = null;
  let newEdgeTo: number | null = null;
  let newPeer1: number | null = null;
  let newPeer2: number | null = null;
  let edgeType: LinkType = LinkType.CustomerProvider;

  function addEdge() {
    if (edgeType === LinkType.CustomerProvider) {
      if (!newEdgeFrom || !newEdgeTo) {
        toast.error('From and To ASes must be defined');
        return;
      }

      // We need to do this for some reason
      newEdgeFrom = Number(newEdgeFrom);
      newEdgeTo = Number(newEdgeTo);

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

      // Add link to config
      config.graph.cp_links = [...config.graph.cp_links, [Number(newEdgeFrom), Number(newEdgeTo)]];

      // Reset inputs
      newEdgeFrom = null;
      newEdgeTo = null;
      showModal = false; // Close modal
    } else if (edgeType === LinkType.PeerToPeer) {
      if (!newPeer1 || !newPeer2) {
        toast.error('Both peer ASes must be defined');
        return;
      }

      // We need to do this for some reason
      newPeer1 = Number(newPeer1);
      newPeer2 = Number(newPeer2);

      const newEdge = {
        from: Number(newPeer1),
        to: Number(newPeer2),
        dashes: true,
        width: 2,
        arrows: 'to, from'
      };

      edges.add(newEdge);
      // network.setData({ nodes, edges });

      // Add peer link to config
      config.graph.peer_links = [...config.graph.peer_links, [Number(newPeer1), Number(newPeer2)]];

      // Reset inputs
      newPeer1 = null;
      newPeer2 = null;
      showModal = false; // Close modal
    }

    // Adjust height of graph
    const levels = getPropagationRanks({
      cp_links: config.graph.cp_links,
      peer_links: config.graph.peer_links
    });

    nodes.forEach((node) => {
      nodes.update({ ...node, level: levels[node.id as number] || 1 });
    });
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
          <Input type="number" bind:value={newEdgeFrom} placeholder="From ASN" class="col-span-1" />
          <Input type="number" bind:value={newEdgeTo} placeholder="To ASN" />
        </div>
      </Tabs.Content>

      <Tabs.Content value={LinkType.PeerToPeer}>
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
