<script>
  export let showModal = false;

  let dialog; // HTMLDialogElement

  $: if (dialog && showModal) dialog.showModal();

  const citation = `@inproceedings{10.1145/3607505.3607509,
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

  function copyToClipboard() {
    navigator.clipboard.writeText(citation).then(
      () => {
        // Success message or action
        console.log('Citation copied to clipboard');
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- {#if showInfo} -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
  bind:this={dialog}
  on:close={() => (showModal = false)}
  on:click|self={() => dialog.close()}
>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

  <div
    class="fixed z-10 inset-0 overflow-y-auto"
    aria-labelledby="modal-title"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-full p-4 text-center sm:p-0">
      <div
        class="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-2xl sm:w-full"
        role="document"
      >
        <button class="m-4 float-end" on:click={copyToClipboard}>
          <svg
            aria-hidden="true"
            clip-rule="evenodd"
            fill-rule="evenodd"
            stroke-linejoin="round"
            stroke-miterlimit="2"
            width="24"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            ><path
              d="m6 18h-3c-.48 0-1-.379-1-1v-14c0-.481.38-1 1-1h14c.621 0 1 .522 1 1v3h3c.621 0 1 .522 1 1v14c0 .621-.522 1-1 1h-14c-.48 0-1-.379-1-1zm1.5-10.5v13h13v-13zm9-1.5v-2.5h-13v13h2.5v-9.5c0-.481.38-1 1-1z"
              fill-rule="nonzero"
            /></svg
          >
        </button>
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <pre class="whitespace-pre overflow-auto max-h-80 font-mono text-sm">{citation}</pre>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded border border-gray-200 px-4 py-2 bg-white text-base font-medium text-gray-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            on:click={() => dialog.close()}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</dialog>

<!-- {/if} -->

<style>
  .transition-opacity {
    transition: opacity 0.3s ease-in-out;
  }

  .transform {
    transition: transform 0.3s ease-in-out;
  }
</style>
