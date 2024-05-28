<script lang="ts">
  import type { Config } from '$lib/types';
  import { flyAndScale } from '$lib/utils';
  import { removeAS } from '$lib/utils/as';
  import { isPeerLink, removeLink, swapCustomerProvider, swapLinkType } from '$lib/utils/link';
  import { ArrowLeftRight, Pencil, Plus, Trash2 } from 'lucide-svelte';
  import type { DataSet, Edge, Node } from 'vis-network/standalone';
  import ContextMenuButton from '$lib/components/ui/context-menu-button.svelte';

  export let showMenu: boolean;
  export let x: number;
  export let y: number;
  export let contextASN: number | null;
  export let contextLink: Edge | null;
  export let nodes: DataSet<Node>;
  export let edges: DataSet<Edge>;
  export let config: Config;
  export let onRename: () => void;
  export let onAddAS: () => void;
  export let onAddLink: () => void;
  export let deselectAS: () => void;
  export let deselectLink: () => void;
  export let refreshSelectedAS: () => void;

  function close() {
    showMenu = false;
  }
</script>

{#if showMenu}
  <div
    transition:flyAndScale
    class="z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md focus:outline-none absolute"
    style="left: {x}px; top: {y}px;">
    {#if contextASN !== null}
      <!-- AS options -->
      <ContextMenuButton
        on:click={() => {
          onRename();
          close();
        }}>
        <Pencil class="size-4 mr-2" />
        Change AS Number
      </ContextMenuButton>
      <ContextMenuButton
        on:click={() => {
          removeAS(contextASN, nodes, edges, config);
          deselectAS();
          close();
        }}>
        <Trash2 class="size-4 mr-2" />
        Delete AS
      </ContextMenuButton>
    {:else if contextLink !== null}
      <!-- Link options -->
      {#if isPeerLink(contextLink, edges, config)}
        <ContextMenuButton
          on:click={() => {
            swapLinkType(contextLink, nodes, edges, config);
            refreshSelectedAS();
            close();
          }}>
          <ArrowLeftRight class="size-4 mr-2" />
          Switch to CP Link
        </ContextMenuButton>
      {:else}
        <ContextMenuButton
          on:click={() => {
            swapLinkType(contextLink, nodes, edges, config);
            refreshSelectedAS();
            close();
          }}>
          <ArrowLeftRight class="size-4 mr-2" />
          Switch to Peer Link
        </ContextMenuButton>
        <ContextMenuButton
          on:click={() => {
            swapCustomerProvider(contextLink, nodes, edges, config);
            refreshSelectedAS();
            close();
          }}>
          <ArrowLeftRight class="size-4 mr-2" />
          Swap Customer and Provider
        </ContextMenuButton>
      {/if}
      <ContextMenuButton
        on:click={() => {
          removeLink(contextLink, nodes, edges, config);
          deselectLink();
          refreshSelectedAS();
          close();
        }}>
        <Trash2 class="size-4 mr-2" />
        Delete Link
      </ContextMenuButton>
    {:else}
      <ContextMenuButton
        on:click={() => {
          onAddAS();
          close();
        }}>
        <Plus class="size-4 mr-2" />
        Add AS
      </ContextMenuButton>
      <ContextMenuButton
        on:click={() => {
          onAddLink();
          close();
        }}>
        <Plus class="size-4 mr-2" />
        Add Link
      </ContextMenuButton>
    {/if}
  </div>
{/if}
