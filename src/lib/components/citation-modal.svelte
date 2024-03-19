<script>
  import { Button } from './ui/button';
  import Check from 'lucide-svelte/icons/check';
  import Copy from 'lucide-svelte/icons/copy';
  import * as Dialog from './ui/dialog';

  export let showModal = false;
  const citation = `@inproceedings{10.1145/3607505.360750,
author = {Furuness, Justin and Morris, Cameron and Morillo, Reynaldo and Herzberg, Amir and Wang, Bing},
title = {BGPy: The BGP Python Security Simulator},
year = {2023},
isbn = {9798400707889},
publisher = {Association for Computing Machinery},
address = {New York, NY, USA},
url = {https://doi.org/10.1145/3607505.3607509},
doi = {10.1145/3607505.3607509},
abstract = {The security of Border Gateway Protocol (BGP), and inter-domain routing in general, remains a challenge, in spite of its well-known importance, repeated attacks and incidents, and extensive efforts and research over decades. We present BGPy, an open-source, extensible, robust, easy-to-use and efficient BGP security simulator, to be used for research and education. BGPy allows realistic simulations of a large variety of BGP attacks and defenses. It is provided as a Python package, and can be further customized and extended, e.g., to investigate new attacks and new defense mechanisms. We describe how BGPy is currently used by multiple BGP security projects.},
booktitle = {Proceedings of the 16th Cyber Security Experimentation and Test Workshop},
pages = {41-56},
numpages = {16},
location = {Marina del Rey, CA, USA},
series = {CSET '23}
}`;
  let copied = false;
  let copyTimeout = 0;

  function copyToClipboard() {
    navigator.clipboard.writeText(citation);
    copied = true;
    clearTimeout(copyTimeout);
    copyTimeout = window.setTimeout(() => (copied = false), 1000);
  }
</script>

<Dialog.Root bind:open={showModal}>
  <Dialog.Content class="max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>BGPy Citation</Dialog.Title>
    </Dialog.Header>

    <div class="flex overflow-hidden gap-x-1 bg-slate-50 rounded-md text-secondary-foreground">
      <pre
        class="text-sm font-mono overflow-auto my-2 ml-2 text-secondary-foreground">{citation}</pre>

      <div>
        <Button
          size="icon"
          variant="ghost"
          class="size-8 my-1 mr-1"
          on:click={() => {
            copyToClipboard();
          }}
        >
          {#if !copied}
            <Copy class="size-4" />
          {:else}
            <Check class="size-4 text-emerald-600" />
          {/if}
        </Button>
      </div>
    </div>

    <!-- <Dialog.Footer>
      <Button on:click={() => (showModal = false)} variant="outline">Close</Button>
    </Dialog.Footer> -->
  </Dialog.Content>
</Dialog.Root>
