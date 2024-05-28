<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Label } from '$lib/components/ui/label';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import type { DataSet, Edge, Node } from 'vis-network/standalone';
  import type { Config } from '$lib/types';
  import { toast } from 'svelte-sonner';
  import { changeASN } from '$lib/utils/as';

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
    if (nodes.get(newNum)) {
      toast.error(`AS ${newNum} already exists`);
      return;
    }

    // Negative number
    if (newNum < 0) {
      toast.error('AS Number cannot be negative');
      return;
    }

    changeASN(oldNum, newNum, nodes, edges, config);

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
