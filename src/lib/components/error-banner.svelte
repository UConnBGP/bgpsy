<script lang="ts">
  import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
  import X from 'lucide-svelte/icons/x';

  export let message: string;
  export let showBanner: boolean;
</script>

{#if showBanner}
  <div
    class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg relative mb-4"
    role="alert"
  >
    <AlertTriangle class="size-4 inline mb-1 mr-1" />
    <strong class="font-bold">Error!</strong>
    <span class="block sm:inline">{message}</span>
    <button
      class="absolute top-0 bottom-0 right-0 p-4 opacity-70 hover:opacity-100"
      on:click={() => (showBanner = false)}
    >
      <X class="size-4" />
    </button>
  </div>
{/if}
