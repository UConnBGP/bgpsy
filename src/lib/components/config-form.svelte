<script lang="ts">
  import type { Announcement, Config } from '../types';
  import * as Table from './ui/table';
  import * as Dialog from './ui/dialog';
  import * as DropdownMenu from './ui/dropdown-menu';
  import * as Select from './ui/select';
  import { Input } from './ui/input';
  import { Label } from './ui/label';
  import { Button } from './ui/button';
  import { Switch } from './ui/switch';
  import { Checkbox } from './ui/checkbox';
  import { isAnnouncementEmpty } from '../utils';
  import { X, Check, Pencil, Trash2, Plus, MoreHorizontal } from 'lucide-svelte';

  export let config: Config;
  export let handleSubmit: () => Promise<void>;

  let showAddAnnouncementModal = false;
  let showEditAnnouncementModal = false;
  let newAnnouncement: Announcement = {
    prefix: '',
    as_path: [],
    seed_asn: '',
    roa_valid_length: false,
    roa_origin: ''
  };
  let newAnnouncementCalculateASPath = true;
  let newAnnouncementCalculateROA = true;
  let selectedAnnouncement: Announcement;
  let selectedIndex: number;

  function addAnnouncement() {
    if (config.announcements == null) {
      config.announcements = [];
    }
    // let timestamp = 0;
    // if (config.announcements.length == 1) {
    //   timestamp = 1;
    // }
    // const newAnnouncement: Announcement = {
    //   prefix: '',
    //   as_path: [],
    //   seed_asn: '',
    //   roa_valid_length: false,
    //   roa_origin: ''
    // };
    if (isAnnouncementEmpty(newAnnouncement)) {
      return;
    }

    // Seed ASN must be populated
    if (newAnnouncement.seed_asn === '') {
      return;
    }

    // Popualte AS path with just seed ASN
    if (newAnnouncementCalculateASPath) {
      newAnnouncement.as_path.push(newAnnouncement.seed_asn);
    }

    // Create valid ROA
    if (newAnnouncementCalculateROA) {
      newAnnouncement.roa_origin = newAnnouncement.seed_asn;
      newAnnouncement.roa_valid_length = true;
    }

    config.announcements = [...config.announcements, newAnnouncement];
    newAnnouncement = {
      prefix: '',
      as_path: [],
      seed_asn: '',
      roa_valid_length: false,
      roa_origin: ''
    };

    showAddAnnouncementModal = false;

    // Reset
    newAnnouncementCalculateASPath = true;
    newAnnouncementCalculateROA = true;
  }

  function saveAnnouncement() {
    config.announcements[selectedIndex] = selectedAnnouncement;
    // config.announcements = config.announcements;
    showEditAnnouncementModal = false;
  }

  function updateASPath(index: number, value: string) {
    config.announcements[index].as_path = value
      .split(',')
      .map((asn) => parseInt(asn.trim()))
      .filter((asn) => !isNaN(asn));
    console.log(config.announcements[index].as_path);
  }

  function updateASPath2(ann: Announcement, value: string) {
    ann.as_path = value
      .split(',')
      .map((asn) => parseInt(asn.trim()))
      .filter((asn) => !isNaN(asn));
  }
</script>

<!-- Add Announcement Modal -->
<Dialog.Root bind:open={showAddAnnouncementModal}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Add Announcement</Dialog.Title>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">Prefix</Label>
        <Input bind:value={newAnnouncement.prefix} class="col-span-2" />
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">Seed ASN</Label>
        <Input bind:value={newAnnouncement.seed_asn} type="number" class="col-span-2" />
      </div>

      <div class="grid grid-cols-3 items-center gap-4 my-1">
        <Label class="col-span-1 text-right">Calculate AS Path</Label>
        <Checkbox
          id="terms"
          bind:checked={newAnnouncementCalculateASPath}
          class="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
        />
      </div>
      {#if !newAnnouncementCalculateASPath}
        <div class="grid grid-cols-3 items-center gap-4">
          <Label class="text-right">AS Path</Label>
          <Input
            value={newAnnouncement.as_path.join(', ')}
            class="col-span-2"
            on:input={(e) => updateASPath2(newAnnouncement, e.target.value)}
          />
        </div>
      {/if}

      <div class="grid grid-cols-3 items-center gap-4 my-1">
        <Label class="col-span-1 text-right">Calculate ROA</Label>
        <Checkbox
          id="terms"
          bind:checked={newAnnouncementCalculateROA}
          class="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
        />
      </div>
      {#if !newAnnouncementCalculateROA}
        <div class="grid grid-cols-3 items-center gap-4">
          <Label class="text-right col-span-1">ROA Origin ASN</Label>
          <Input bind:value={newAnnouncement.roa_origin} type="number" class="col-span-2" />
        </div>
        <div class="grid grid-cols-3 items-center gap-4">
          <Label class="text-right col-span-1">ROA Valid Length?</Label>
          <Switch
            bind:checked={newAnnouncement.roa_valid_length}
            class="data-[state=checked]:bg-emerald-500"
          />
        </div>
      {/if}
    </div>
    <Dialog.Footer>
      <Button on:click={addAnnouncement} class="bg-emerald-500 hover:bg-emerald-500">Add</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Edit Modal -->
<Dialog.Root bind:open={showEditAnnouncementModal}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Edit Announcement</Dialog.Title>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">Prefix</Label>
        <Input bind:value={selectedAnnouncement.prefix} class="col-span-2" />
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">Seed ASN</Label>
        <Input bind:value={selectedAnnouncement.seed_asn} type="number" class="col-span-2" />
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">AS Path</Label>
        <Input
          value={selectedAnnouncement.as_path.join(', ')}
          class="col-span-2"
          on:input={(e) => updateASPath2(selectedAnnouncement, e.target.value)}
        />
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right col-span-1">ROA Origin ASN</Label>
        <Input bind:value={selectedAnnouncement.roa_origin} type="number" class="col-span-2" />
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right col-span-1">ROA Valid Length?</Label>
        <Switch bind:checked={selectedAnnouncement.roa_valid_length} />
      </div>
    </div>
    <Dialog.Footer>
      <Button on:click={() => (showEditAnnouncementModal = false)} variant="outline">Cancel</Button>
      <Button on:click={saveAnnouncement}>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Form -->
<form class="space-y-4">
  <!-- Name -->
  <div>
    <label for="name" class="block text-sm font-medium leading-6 mb-2">Name</label>
    <!-- <input
      type="text"
      bind:value={config.name}
      placeholder="Name"
      class="p-2 border border-gray-300 rounded w-full"
      id="name"
    /> -->
    <Input type="text" bind:value={config.name} placeholder="Name" id="name" />
  </div>

  <!-- Description -->
  <div>
    <label for="desc" class="block text-sm font-medium leading-6 mb-2">Description</label>
    <!-- <input
      type="text"
      bind:value={config.desc}
      placeholder="Description"
      class="p-2 border border-gray-300 rounded w-full"
      id="destination"
    /> -->
    <Input type="text" bind:value={config.desc} placeholder="Description" id="desc" />
  </div>

  <!-- Scenario -->
  <div>
    <label for="scenario" class="block text-sm font-medium leading-6 mb-2">Scenario</label>
    <select
      bind:value={config.scenario}
      class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      on:change={() => {
        if (config.scenario !== null) {
          config.announcements = [];
        }
      }}
    >
      <option value={null}>Custom Scenario</option>
      <option value="SubprefixHijack">Subprefix Hijack</option>
      <option value="PrefixHijack">Prefix Hijack</option>
      <option value="ValidPrefix">Valid Prefix</option>
      <option value="SuperprefixPrefixHijack">Superprefix Prefix Hijack</option>
      <option value="NonRoutedPrefixHijack">Non-Routed Prefix Hijack</option>
      <option value="NonRoutedSuperprefixHijack">Non-Routed Superprefix Hijack</option>
      <option value="NonRoutedSuperprefixPrefixHijack">Non-Routed Superprefix Prefix Hijack</option>
      <option value="AccidentalRouteLeak">Accidental Route Leak</option>
    </select>
    <!-- <Select.Root
      selected={{ value: config.scenario ?? null, label: config.scenario ?? 'foo' }}
      on:change={() => {}}
    >
      <Select.Trigger>
        <Select.Value placeholder="Scenario" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="">Custom Scenario</Select.Item>
        <Select.Item value="SubprefixHijack">Subprefix Hijack</Select.Item>
        <Select.Item value="ValidPrefix">Valid Prefix</Select.Item>
        <Select.Item value="SuperprefixPrefixHijack">Superprefix Prefix Hijack</Select.Item>
        <Select.Item value="NonRoutedPrefixHijack">Non-Routed Prefix Hijack</Select.Item>
        <Select.Item value="NonRoutedSuperprefixHijack">Non-Routed Superprefix Hijack</Select.Item>
        <Select.Item value="NonRoutedSuperprefixPrefixHijack"
          >Non-Routed Superprefix Prefix Hijack</Select.Item
        >
        <Select.Item value="AccidentalRouteLeak">Accidental Route Leak</Select.Item>
      </Select.Content>
      <Select.Input />
    </Select.Root> -->
  </div>

  <!-- Show attack modifier when custom scenario is selected -->
  {#if config.scenario !== null}
    <div>
      <label for="attack-modifier" class="block text-sm font-medium leading-6 mb-2"
        >Attack Modifier</label
      >
      <select
        bind:value={config.scenario_modifier}
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <option value={null}>None</option>
        <option value="origin_hijack">Origin Hijack</option>
        <option value="shortest_path_export_all_hijack">Shortest Path Export All</option>
      </select>
    </div>
  {/if}

  <!-- Announcements -->
  {#if config.scenario === null}
    <div>
      <div class="flex justify-between mb-1">
        <label for="add-announcement" class="block text-sm font-medium leading-6 mb-2"
          >Announcements</label
        >
        <Button
          id="add-announcement"
          size="icon"
          variant="ghost"
          class="bg-emerald-500 hover:bg-emerald-500/90 rounded-full size-6 text-white hover:text-accent-background"
          on:click={() => (showAddAnnouncementModal = true)}
        >
          <Plus class="size-4" />
        </Button>
      </div>

      <!-- {#each config.announcements as announcement, index}
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
      {/each} -->

      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Prefix</Table.Head>
            <Table.Head>Seed ASN</Table.Head>
            <Table.Head>AS Path</Table.Head>
            <Table.Head>ROA Origin ASN</Table.Head>
            <Table.Head>ROA Length Valid?</Table.Head>
            <!-- <Table.Head>Action</Table.Head> -->
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each config.announcements as announcement, index}
            <Table.Row>
              <Table.Cell>{announcement.prefix}</Table.Cell>
              <Table.Cell>{announcement.seed_asn}</Table.Cell>
              <Table.Cell>{announcement.as_path.join(', ')}</Table.Cell>
              <Table.Cell>{announcement.roa_origin}</Table.Cell>
              <Table.Cell>
                {#if announcement.roa_valid_length}
                  <Check class="size-4" color="green" />
                {:else}
                  <X class="size-4" color="red" />
                {/if}
              </Table.Cell>
              <Table.Cell>
                <!-- <span class="space-x-1">
                  <Button
                    on:click={() => {
                      selectedAnnouncement = announcement;
                      selectedIndex = index;
                      showEditAnnouncementModal = true;
                    }}
                    variant="ghost"
                    size="icon"
                    class="h-4 w-4"
                  >
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button
                    on:click={() => {
                      config.announcements.splice(index, 1);
                      config.announcements = config.announcements;
                    }}
                    variant="ghost"
                    size="icon"
                    class="h-4 w-4"
                  >
                    <Trash2 class="h-4 w-4" color="red" />
                  </Button>
                </span> -->

                <!-- Dropdown menu for actions -->
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild let:builder>
                    <Button
                      variant="ghost"
                      builders={[builder]}
                      size="icon"
                      class="relative w-7 h-7 p-0"
                    >
                      <span class="sr-only">Open menu</span>
                      <MoreHorizontal class="w-4 h-4" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="center">
                    <DropdownMenu.Group>
                      <DropdownMenu.Label>Actions</DropdownMenu.Label>
                      <DropdownMenu.Item
                        on:click={() => {
                          selectedAnnouncement = announcement;
                          selectedIndex = index;
                          showEditAnnouncementModal = true;
                        }}
                      >
                        <Pencil class="mr-2 size-4" />
                        <span>Edit</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        on:click={() => {
                          config.announcements.splice(index, 1);
                          config.announcements = config.announcements;
                        }}
                        class="text-destructive data-[highlighted]:text-destructive"
                      >
                        <Trash2 class="mr-2 size-4" />
                        <span>Delete</span>
                      </DropdownMenu.Item>
                    </DropdownMenu.Group>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {/if}
</form>
