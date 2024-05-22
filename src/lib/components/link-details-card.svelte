<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { X } from 'lucide-svelte';
  import type { DataSet, Edge, Node } from 'vis-network/standalone';
  import type { Config } from '$lib/types';
  import { isPeerLink, removeLink, swapCustomerProvider, swapLinkType } from '$lib/utils/link';
  import { updatePropRanks } from '$lib/utils/as';

  export let selectedLinkID: string | null;
  export let selectedLink: Edge | null;
  export let nodes: DataSet<Node>;
  export let edges: DataSet<Edge>;
  export let config: Config;

  let isPeer: boolean;

  $: if (selectedLink !== null) {
    isPeer = isPeerLink(selectedLink, edges, config);
  }

  // $: isPeer, console.log('value changed:', isPeer);

  function switchLinkType() {
    if (selectedLink === null) {
      return;
    }

    swapLinkType(selectedLink, nodes, edges, config);
    isPeer = !isPeer;
  }

  function swapCP() {
    if (selectedLink === null) {
      return;
    }

    swapCustomerProvider(selectedLink, nodes, edges, config);
  }

  function deleteLink() {
    if (selectedLink === null) {
      return;
    }

    // Remove link from graph and config
    removeLink(selectedLink, nodes, edges, config);
    close();
  }

  function close() {
    // Reset all input
    selectedLinkID = null;
    selectedLink = null;
  }
</script>

{#if selectedLinkID !== null && selectedLink !== null}
  <Card.Root class="mx-auto max-w-full lg:max-w-[50vw] relative mt-4 md:mb-0 mb-4">
    <Card.Header>
      <Card.Title>
        Selected Link: {selectedLink.from} to {selectedLink.to}
      </Card.Title>
      <Card.Description>
        {isPeer ? 'Peer' : 'Customer-Provider'} Link
      </Card.Description>
      <button
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        on:click={close}>
        <X class="size-4" />
        <span class="sr-only">Close</span>
      </button>
    </Card.Header>
    <Card.Content>
      {#if isPeer}
        <Button on:click={switchLinkType} variant="outline">Switch to CP Link</Button>
      {:else}
        <Button on:click={switchLinkType} variant="outline">Switch to Peer Link</Button>
        <Button on:click={swapCP} variant="outline">Swap Customer and Provider</Button>
      {/if}
    </Card.Content>
    <Card.Footer class="space-x-2">
      <Button on:click={deleteLink} variant="destructive">Delete Link</Button>
    </Card.Footer>
  </Card.Root>
{/if}
