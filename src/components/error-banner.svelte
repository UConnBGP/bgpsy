<script lang="ts">
  export let message: string;
  export let showBanner: boolean;
</script>

{#if showBanner}
  <div
    class="bg-red-200 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
    role="alert"
  >
    <strong class="font-bold">Error!</strong>
    <span class="block sm:inline">{message}</span>
    <button class="absolute top-0 bottom-0 right-0 px-4 py-3" on:click={() => (showBanner = false)}>
      <svg
        class="fill-current h-6 w-6 text-red-500"
        role="button"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
      >
        <title>Close</title>
        <path
          d="M14.348 14.849a.5.5 0 0 1-.708 0L10 11.207l-3.65 3.65a.5.5 0 0 1-.707-.708l3.65-3.65-3.65-3.65a.5.5 0 1 1 .707-.708l3.65 3.65 3.65-3.65a.5.5 0 0 1 .708.708L10.707 10l3.65 3.65a.5.5 0 0 1 0 .708z"
        />
      </svg>
    </button>
  </div>
{/if}
