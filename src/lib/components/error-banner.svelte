<script lang="ts">
  import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
  import X from 'lucide-svelte/icons/x';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils';

  export let message: string;
  export let open: boolean;
  let className: HTMLAttributes<HTMLDivElement>['class'] = undefined;
  export { className as class };
</script>

{#if open}
  <div
    class={cn(
      'bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex justify-between items-center space-x-2',
      className
    )}
    role="alert">
    <div class="justify-start items-center flex">
      <AlertTriangle class="size-4 mr-2" />
      <strong class="font-bold mr-1">Error!</strong>
      <span>{message}</span>
    </div>
    <div class="justify-end">
      <button class="opacity-70 hover:opacity-100" on:click={() => (open = false)}>
        <X class="size-4" />
      </button>
    </div>
  </div>
{/if}

<!-- {#if open}
  <div
    class={cn(
      'bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg relative',
      className
    )}
    role="alert">
    <AlertTriangle class="size-4 inline mb-1 mr-1" />
    <strong class="font-bold">Error!</strong>
    <span class="block sm:inline">{message}</span>
    <button
      class="absolute top-0 bottom-0 right-0 p-4 opacity-70 hover:opacity-100"
      on:click={() => (open = false)}>
      <X class="size-4" />
    </button>
  </div>
{/if} -->
