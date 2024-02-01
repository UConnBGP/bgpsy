<script lang="ts">
  import type { Announcement, Config } from '$lib';

  export let config: Config;
  export let handleSubmit: () => Promise<void>;

  function addAnnouncement() {
    if (config.announcements == null) {
      config.announcements = [];
    }
    // let timestamp = 0;
    // if (config.announcements.length == 1) {
    //   timestamp = 1;
    // }
    const newAnnouncement: Announcement = {
      prefix: '',
      as_path: [],
      seed_asn: '',
      roa_valid_length: false,
      roa_origin: ''
    };
    config.announcements.push(newAnnouncement);
    config.announcements = config.announcements;
    console.log(newAnnouncement);
  }

  function updateASPath(index: number, value: string) {
    config.announcements[index].as_path = value
      .split(',')
      .map((asn) => parseInt(asn.trim()))
      .filter((asn) => !isNaN(asn));
    console.log(config.announcements[index].as_path);
  }
</script>

<form class="space-y-4">
  <div>
    <label for="name" class="block text-sm font-medium leading-6 mb-2">Name</label>
    <input
      type="text"
      bind:value={config.name}
      placeholder="Name"
      class="p-2 border border-gray-300 rounded w-full"
      id="name"
    />
  </div>
  <div>
    <label for="desc" class="block text-sm font-medium leading-6 mb-2">Description</label>
    <input
      type="text"
      bind:value={config.desc}
      placeholder="Description"
      class="p-2 border border-gray-300 rounded w-full"
      id="destination"
    />
  </div>
  <div>
    <label for="scenario" class="block text-sm font-medium leading-6 mb-2">Scenario</label>
    <select bind:value={config.scenario} class="p-2 border border-gray-300 rounded w-full">
      <option value={null}>Custom Scenario</option>
      <option value="SubprefixHijack">Subprefix Hijack</option>
      <option value="PrefixHijack">Prefix Hijack</option>
      <option value="ValidPrefix">Valid Prefix</option>
      <option value="SuperprefixPrefixHijack">Superprefix Prefix Hijack</option>
      <option value="NonRoutedPrefixHijack">Non-Routed Prefix Hijack</option>
      <option value="NonRoutedSuperprefixHijack">Non-Routed Superprefix Hijack</option>
      <option value="NonRoutedSuperprefixPrefixHijack">Non-Routed Superprefix Prefix Hijack</option>
    </select>
  </div>
  <!-- <div>
    <label for="rounds" class="block text-sm font-medium leading-6 mb-2">Propagation Rounds</label>
    <select
      bind:value={config.propagation_rounds}
      class="p-2 border border-gray-300 rounded w-full"
    >
      <option value={1}>1</option>
      <option value={2}>2</option>
    </select>
  </div> -->

  <!-- Announcements -->
  {#if config.scenario === null}
    <div>
      <div class="flex justify-between mb-1">
        <label class="block text-sm font-medium leading-6 mb-2">Announcements</label>
        <button
          type="button"
          on:click={addAnnouncement}
          class="bg-emerald-500 text-white rounded-full h-6 w-6 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      {#each config.announcements as announcement, index}
        <hr />
        <div class="space-y-1 my-4">
          <div class="flex items-center space-x-10">
            <label class="text-sm font-medium leading-6">Prefix</label>
            <input
              type="text"
              bind:value={announcement.prefix}
              placeholder="Prefix"
              class="p-2 border border-gray-300 rounded flex-grow"
            />
          </div>

          <div class="flex items-center space-x-7">
            <label class="text-sm font-medium leading-6">AS Path</label>
            <input
              type="text"
              value={announcement.as_path.join(', ')}
              placeholder="AS Path (comma-separated)"
              class="p-2 border border-gray-300 rounded flex-grow"
              on:input={(e) => updateASPath(index, e.target.value)}
            />
          </div>

          <div class="flex items-center space-x-4">
            <label class="text-sm font-medium leading-6">Seed ASN</label>
            <input
              type="number"
              bind:value={announcement.seed_asn}
              placeholder="Seed ASN"
              class="p-2 border border-gray-300 rounded flex-grow"
            />
          </div>

          <div class="flex items-center space-x-2">
            <label class="text-sm font-medium leading-6">ROA Origin</label>
            <input
              type="number"
              bind:value={announcement.roa_origin}
              placeholder="ROA Origin"
              class="p-2 border border-gray-300 rounded flex-grow"
            />
          </div>

          <div class="flex justify-between">
            <label class="inline-flex items-center">
              <input
                type="checkbox"
                on:click|stopPropagation={() => {}}
                bind:checked={announcement.roa_valid_length}
                class="form-checkbox h-5 w-5 text-gray-600"
              />
              <span class="ml-2 text-gray-700">Is ROA Length Valid?</span>
            </label>
            <button
              type="button"
              on:click={() => {
                config.announcements.splice(index, 1);
                config.announcements = config.announcements;
              }}
              class="bg-red-500 text-white rounded-full h-8 w-8 flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"
                />
                <path
                  d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"
                />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</form>
