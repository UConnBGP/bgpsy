<script>
  import Input from '$lib/components/ui/input/input.svelte';

  let numInput = null;
  let defInput;
</script>

<div class="container py-4">
  <Input class="border-2 border-gray-500" type="number" bind:value={numInput} />
  <Input class="border-2 border-gray-500" bind:value={defInput} />

  <p>{numInput}</p>
  <p>{typeof numInput}</p>

  <p class="">{defInput === '' ? 'blank' : defInput}</p>
  <p>{typeof defInput}</p>
</div>
