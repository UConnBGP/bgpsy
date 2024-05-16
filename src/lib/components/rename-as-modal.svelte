<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Label } from '$lib/components/ui/label';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import type { DataSet, Edge, Node } from 'vis-network/standalone';
  import type { Config } from '$lib/types';
  import { getPropagationRanks } from '$lib/utils';
  import { toast } from 'svelte-sonner';

  // Props
  export let showModal: boolean;
  export let nodes: DataSet<Node>;
  export let edges: DataSet<Edge>;
  export let config: Config;
  export let oldASN: number | null;

  let newASN = oldASN;

  // Update new value every time different AS is selected
  $: if (oldASN) {
    newASN = oldASN;
  }

  function renameAS(oldNum: number | null, newNum: number | null) {
    if (oldNum === null || newNum === null) {
      return;
    }

    // We need to do this for some reason
    oldNum = Number(oldNum);
    newNum = Number(newNum);

    // Number already used
    if (nodes.get({ filter: (node) => node.id === newNum }).length > 0) {
      toast.error(`AS ${newNum} already exists`);
      return;
    }

    // Update the node's ID and label
    const nodeToUpdate = nodes.get(oldNum);
    if (!nodeToUpdate) {
      return;
    }

    nodes.remove(nodeToUpdate);
    nodes.add({ ...nodeToUpdate, id: Number(newNum), label: String(newNum) });

    // Update all edges connected to this node
    edges.forEach((edge) => {
      if (edge.from === oldNum) {
        edges.update({ ...edge, from: newNum });
      }
      if (edge.to === oldNum) {
        edges.update({ ...edge, to: newNum });
      }
    });

    // Update cpLinks and peerLinks if necessary
    config.graph.cp_links = config.graph.cp_links.map((link) =>
      link.map((id) => (id === oldNum ? newNum : id))
    );
    config.graph.peer_links = config.graph.peer_links.map((link) =>
      link.map((id) => (id === oldNum ? newNum : id))
    );

    // Adjust height of graph
    const levels = getPropagationRanks({
      cp_links: config.graph.cp_links,
      peer_links: config.graph.peer_links
    });
    nodes.forEach((node) => {
      nodes.update({ ...node, level: levels[node.id as number] || 1 });
    });

    // Dismiss modal
    showModal = false;
  }
</script>

<Dialog.Root bind:open={showModal}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Rename AS {oldASN}</Dialog.Title>
    </Dialog.Header>

    <div class="grid grid-cols-5 items-center gap-4">
      <Label class="text-right">AS Number</Label>
      <Input bind:value={newASN} class="col-span-4" type="number" />
    </div>

    <Dialog.Footer>
      <Button on:click={() => renameAS(oldASN, Number(newASN))}>Change ASN</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
