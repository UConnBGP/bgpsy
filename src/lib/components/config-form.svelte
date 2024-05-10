<script lang="ts">
  import type { Announcement, AnnouncementValidition, Config, ROA } from '../types';
  import * as Table from './ui/table';
  import * as Dialog from './ui/dialog';
  import * as DropdownMenu from './ui/dropdown-menu';
  import * as Accordion from '$lib/components/ui/accordion';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Input } from './ui/input';
  import { Label } from './ui/label';
  import { Button } from './ui/button';
  import { Switch } from './ui/switch';
  import { Checkbox } from './ui/checkbox';
  import { isAnnouncementEmpty } from '../utils';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import Pencil from 'lucide-svelte/icons/pencil';
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import Plus from 'lucide-svelte/icons/plus';
  import MoreHorizontal from 'lucide-svelte/icons/more-horizontal';
  import { toast } from 'svelte-sonner';
  import { parseCIDR } from 'ipaddr.js';
  import { HelpCircle } from 'lucide-svelte';

  export let config: Config;
  export let annROAStates: string[] = [];
  export let roleMap: Record<number, string>;

  let showAddAnnouncementModal = false;
  let showEditAnnouncementModal = false;
  let showAddROAModal = false;
  let showEditROAModal = false;
  let newAnnouncement: Announcement = {
    prefix: '',
    as_path: [],
    // @ts-ignore
    seed_asn: ''
    // roa_valid_length: false,
    // roa_origin: ''
  };
  let newROA: ROA = {
    prefix: '',
    // @ts-ignore
    origin: '',
    // @ts-ignore
    max_length: ''
  };

  let newAnnouncementCalculateASPath = true;
  let newAnnouncementCalculateROA = true;
  let selectedAnnouncement: Announcement;
  let selectedIndex: number;

  let newROACalculateLength = true;
  let selectedROACalculateLength: boolean;
  let selectedROA: ROA;

  async function addAnnouncement() {
    if (config.announcements === null) {
      config.announcements = [];
    }

    // if (isAnnouncementEmpty(newAnnouncement)) {
    //   return;
    // }

    // Prefix must be specified
    if (newAnnouncement.prefix === '') {
      toast.error('Prefix is not specified');
      return;
    }

    // Check if prefix is a valid IP address
    try {
      const _ = parseCIDR(newAnnouncement.prefix);
    } catch {
      toast.error(`${newAnnouncement.prefix} is not a valid CIDR prefix`);
      return;
    }

    // Seed ASN must be populated
    // @ts-ignore
    if (newAnnouncement.seed_asn === '') {
      toast.error('Announced by ASN is not specified');
      return;
    }

    // AS path must be populated
    if (!newAnnouncementCalculateASPath && newAnnouncement.as_path.length === 0) {
      toast.error('AS Path cannot be empty');
      return;
    }

    // Popualte AS path with just seed ASN
    if (newAnnouncementCalculateASPath) {
      newAnnouncement.as_path.push(newAnnouncement.seed_asn);
    }

    // Create corresponding valid ROA
    if (newAnnouncementCalculateROA) {
      const roa = {
        prefix: newAnnouncement.prefix,
        origin: newAnnouncement.seed_asn
      };
      config.roas = [...(config.roas ?? []), roa];
    }

    config.announcements = [...config.announcements, newAnnouncement];
    newAnnouncement = {
      prefix: '',
      as_path: [],
      // @ts-ignore
      seed_asn: ''
      // roa_valid_length: false,
      // roa_origin: ''
    };

    // Update ROA validity
    annROAStates = await getROAStates();

    showAddAnnouncementModal = false;

    // Reset
    newAnnouncementCalculateASPath = true;
    newAnnouncementCalculateROA = true;
  }

  async function addROA() {
    if (config.roas === null) {
      config.roas = [];
    }

    // ROA must be filled in
    // @ts-ignore
    if (newROA.prefix === '' || newROA.origin === '') {
      return;
    }

    // Not sure why I have to do this, TODO: debug
    newROA.origin = Number(newROA.origin);

    if (newROACalculateLength) {
      newROA.max_length = null;
    } else {
      newROA.max_length = Number(newROA.max_length);
    }
    console.log(newROA.max_length);

    config.roas = [...(config.roas ?? []), newROA];
    newROA = {
      prefix: '',
      // @ts-ignore
      origin: '',
      // @ts-ignore
      max_length: ''
      // roa_valid_length: false,
      // roa_origin: ''
    };

    // Update ROA validity
    annROAStates = await getROAStates();

    showAddROAModal = false;

    // Reset state
    newROACalculateLength = true;
  }

  async function saveAnnouncement() {
    config.announcements[selectedIndex] = selectedAnnouncement;
    // config.announcements = config.announcements;

    // Update ROA validity
    annROAStates = await getROAStates();

    showEditAnnouncementModal = false;
  }

  async function saveROA() {
    // Not sure why I have to do this
    // TODO: debug
    selectedROA.origin = Number(selectedROA.origin);

    if (
      selectedROACalculateLength ||
      // @ts-ignore
      selectedROA.max_length === '' ||
      selectedROA.max_length === undefined ||
      selectedROA.max_length === null
    ) {
      selectedROA.max_length = null;
    } else {
      selectedROA.max_length = Number(selectedROA.max_length);
    }
    console.log(selectedROA.max_length);
    if (config.roas === undefined) {
      console.log('roas array is empty');
      return;
    }

    config.roas[selectedIndex] = selectedROA;

    // Update ROA validity
    annROAStates = await getROAStates();

    showEditROAModal = false;
  }

  async function getROAStates(): Promise<string[]> {
    // return Promise.all(config.announcements.forEach((ann) => checkAnnValidity));
    let states = [];
    for (let ann of config.announcements) {
      const state = await checkAnnValidity(ann);
      states.push(state);
    }
    // console.log(states);

    return states;
  }

  function updateASPath(ann: Announcement, value: string) {
    ann.as_path = value
      .split(/,|-/) // Split by either comma or comma
      .map((asn) => parseInt(asn.trim()))
      .filter((asn) => !isNaN(asn));
  }

  function calcMaxLength(roa: ROA): number {
    // TODO: Add better check
    if (!roa.prefix.includes('/')) {
      return 0;
    }
    const parts = roa.prefix.split('/');
    return Number(parts[parts.length - 1]);
  }

  async function checkAnnValidity(ann: Announcement): Promise<string> {
    if (config.roas === undefined) {
      return 'Unknown';
    }

    const validation: AnnouncementValidition = {
      prefix: ann.prefix,
      origin: ann.seed_asn,
      roas: config.roas
    };
    try {
      const response = await fetch('/api/validate-roa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validation)
      });
      if (!response.ok) {
        return 'Unknown';
      }
      return await response.json();
    } catch (error) {
      return 'Unknown';
    }
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
        <Label class="text-right">Announced by ASN</Label>
        <Input bind:value={newAnnouncement.seed_asn} type="number" class="col-span-2" />
      </div>

      <div class="grid grid-cols-3 items-center gap-4 my-1">
        <Label class="col-span-1 text-right">Define AS Path</Label>
        <Checkbox
          id="terms"
          bind:checked={newAnnouncementCalculateASPath}
          class="data-[state=checked]:bg-emerald-500 border-emerald-500" />
      </div>
      {#if !newAnnouncementCalculateASPath}
        <div class="grid grid-cols-3 items-center gap-4">
          <Label class="text-right">AS Path</Label>
          <Input
            value={newAnnouncement.as_path.join(', ')}
            class="col-span-2"
            on:input={(e) => updateASPath(newAnnouncement, e.target.value)} />
        </div>
      {/if}

      <div class="grid grid-cols-3 items-center gap-4 my-1">
        <Label class="col-span-1 text-right leading-normal">Define Corresponding ROA</Label>
        <Checkbox
          id="terms"
          bind:checked={newAnnouncementCalculateROA}
          class="data-[state=checked]:bg-emerald-500 border-emerald-500" />
      </div>
      <!-- {#if !newAnnouncementCalculateROA}
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
      {/if} -->
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
        <Label class="text-right">Announced by ASN</Label>
        <Input bind:value={selectedAnnouncement.seed_asn} type="number" class="col-span-2" />
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">AS Path</Label>
        <Input
          value={selectedAnnouncement.as_path.join(', ')}
          class="col-span-2"
          on:input={(e) => updateASPath(selectedAnnouncement, e.target.value)} />
      </div>
      <!-- <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right col-span-1">ROA Origin ASN</Label>
        <Input bind:value={selectedAnnouncement.roa_origin} type="number" class="col-span-2" />
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right col-span-1">ROA Valid Length?</Label>
        <Switch bind:checked={selectedAnnouncement.roa_valid_length} />
      </div> -->
    </div>
    <Dialog.Footer>
      <Button on:click={() => (showEditAnnouncementModal = false)} variant="outline">Cancel</Button>
      <Button on:click={saveAnnouncement}>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Add ROA -->
<Dialog.Root bind:open={showAddROAModal}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Add ROA</Dialog.Title>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">Prefix</Label>
        <Input bind:value={newROA.prefix} class="col-span-2" />
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">Origin ASN</Label>
        <Input bind:value={newROA.origin} type="number" class="col-span-2" />
      </div>

      <div class="grid grid-cols-3 items-center gap-4 my-1">
        <Label class="col-span-1 text-right leading-normal">Use Prefix Length for Max Length</Label>
        <Checkbox
          id="terms"
          bind:checked={newROACalculateLength}
          class="data-[state=checked]:bg-emerald-500 border-emerald-500" />
      </div>

      {#if !newROACalculateLength}
        <div class="grid grid-cols-3 items-center gap-4">
          <Label class="text-right">Max Length</Label>
          <Input bind:value={newROA.max_length} class="col-span-2" type="number" />
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      <Button on:click={addROA} class="bg-emerald-500 hover:bg-emerald-500">Add</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Edit ROA -->
<Dialog.Root bind:open={showEditROAModal}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Edit ROA</Dialog.Title>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">Prefix</Label>
        <Input bind:value={selectedROA.prefix} class="col-span-2" />
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">Origin ASN</Label>
        <Input bind:value={selectedROA.origin} type="number" class="col-span-2" />
      </div>

      <div class="grid grid-cols-3 items-center gap-4 my-1">
        <Label class="col-span-1 text-right leading-normal">Use Prefix Length for Max Length</Label>
        <Checkbox id="terms" bind:checked={selectedROACalculateLength} />
      </div>
      {#if !selectedROACalculateLength}
        <div class="grid grid-cols-3 items-center gap-4">
          <Label class="text-right">Max Length</Label>
          <Input bind:value={selectedROA.max_length} class="col-span-2" type="number" />
        </div>
      {/if}
    </div>
    <Dialog.Footer>
      <Button on:click={() => (showEditROAModal = false)} variant="outline">Cancel</Button>
      <Button on:click={saveROA}>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Form -->
<form class="space-y-4">
  <!-- Scenario -->
  <div>
    <div class="flex flex-row items-center space-x-1 mb-2">
      <label for="scenario" class="block text-sm font-medium leading-6">Scenario</label>

      <Tooltip.Root>
        <Tooltip.Trigger>
          <HelpCircle class="size-4" />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>
            Choose a predefined scenario or build your own with <br />custom announcements and ROAs
          </p>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
    <select
      bind:value={config.scenario}
      class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      on:change={() => {
        if (config.scenario !== null) {
          config.announcements = [];
          config.roas = [];
        } else {
          // By default, create an announcement and ROA with the victim (if it exists)

          // Get victim array (should just be one value)
          const victims = Object.entries(roleMap)
            .filter(([_, value]) => value === 'victim')
            .map(([key, _]) => key);

          // Create corresponding announcement and ROA
          if (victims.length > 0) {
            const victimASN = Number(victims[0]);
            const ann = {
              prefix: '1.2.0.0/16', // Sample prefix
              as_path: [victimASN],
              seed_asn: victimASN
            };
            const roa = {
              prefix: '1.2.0.0/16', // Sample prefix
              origin: victimASN,
              max_length: null
            };
            config.announcements = [ann];
            config.roas = [roa];
          }
        }
      }}>
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
  </div>

  <!-- Show attack modifier when custom scenario is selected -->
  {#if config.scenario !== null && config.scenario !== 'ValidPrefix' && config.scenario !== 'AccidentalRouteLeak'}
    <div>
      <div class="flex flex-row items-center space-x-1 mb-2">
        <label for="attack-modifier" class="block text-sm font-medium leading-6">
          Attack Modifier
        </label>

        <Tooltip.Root>
          <Tooltip.Trigger>
            <HelpCircle class="size-4" />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Extend the scenario with a preprocessing function</p>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>

      <select
        bind:value={config.scenario_modifier}
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        <option value={null}>None</option>
        <option value="origin_hijack">Origin Hijack</option>
        <option value="shortest_path_export_all_hijack">Shortest Path Export All</option>
      </select>
    </div>
  {/if}

  <!-- Announcements -->
  {#if config.scenario === null}
    <div class="py-4">
      <div class="flex mb-1">
        <label for="" class="block text-md font-semibold leading-6 mb-2 m-auto">
          Announcements
        </label>

        <Button
          id="add-announcement"
          size="icon"
          variant="ghost"
          class="bg-emerald-500 hover:bg-emerald-500/90 rounded-full size-6 text-white hover:text-accent-background"
          on:click={() => (showAddAnnouncementModal = true)}>
          <Plus class="size-4" />
        </Button>
      </div>
      <hr />

      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Prefix</Table.Head>
            <Table.Head>Announced by ASN</Table.Head>
            <Table.Head>AS Path</Table.Head>
            <Table.Head>ROA State</Table.Head>
            <!-- <Table.Head>ROA Origin ASN</Table.Head>
            <Table.Head>ROA Length Valid?</Table.Head> -->
            <Table.Head>Action</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each config.announcements as announcement, index}
            <Table.Row>
              <Table.Cell>{announcement.prefix}</Table.Cell>
              <Table.Cell>{announcement.seed_asn}</Table.Cell>
              <Table.Cell>{announcement.as_path.join(', ')}</Table.Cell>
              <Table.Cell>
                <!-- {#if isAnnouncementValidByRoa(announcement)}
                  <span
                    class="inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none select-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-emerald-500 border-emerald-500"
                  >
                    Valid
                  </span>
                {:else}
                  <span
                    class="inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none select-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-destructive border-destructive"
                  >
                    Invalid
                  </span>
                {/if} -->
                {#if annROAStates[index] === 'Valid'}
                  <span
                    class="inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-emerald-500 border-emerald-500">
                    Valid
                  </span>
                {:else if annROAStates[index] === 'Invalid'}
                  <span
                    class="inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-destructive border-destructive">
                    Invalid
                  </span>
                {:else}
                  <span
                    class="inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
                    Unknown
                  </span>
                {/if}
              </Table.Cell>
              <Table.Cell>
                <!-- Dropdown menu for actions -->
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild let:builder>
                    <Button
                      variant="ghost"
                      builders={[builder]}
                      size="icon"
                      class="relative w-7 h-7 p-0">
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
                        }}>
                        <Pencil class="mr-2 size-4" />
                        <span>Edit</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        on:click={async () => {
                          config.announcements.splice(index, 1);
                          config.announcements = config.announcements;
                          // Update ROA validity
                          annROAStates = await getROAStates();
                        }}
                        class="text-destructive data-[highlighted]:text-destructive">
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

  <!-- ROAs -->
  {#if config.scenario === null}
    <div class="pb-4">
      <div class="flex justify-between mb-1">
        <label for="" class="block text-md font-semibold leading-6 mb-2 m-auto">ROAs</label>
        <Button
          id="add-roa"
          size="icon"
          variant="ghost"
          class="bg-emerald-500 hover:bg-emerald-500/90 rounded-full size-6 text-white hover:text-accent-background"
          on:click={() => (showAddROAModal = true)}>
          <Plus class="size-4" />
        </Button>
      </div>
      <hr />

      <!-- <div class="flex mb-1">
        <label for="" class="block text-sm font-medium leading-6 mb-2 m-auto">
          Announcements
        </label>

        <Button
          id="add-announcement"
          size="icon"
          variant="ghost"
          class="bg-emerald-500 hover:bg-emerald-500/90 rounded-full size-6 text-white hover:text-accent-background"
          on:click={() => (showAddAnnouncementModal = true)}
        >
          <Plus class="size-4" />
        </Button>
      </div> -->

      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Prefix</Table.Head>
            <Table.Head>Origin ASN</Table.Head>
            <Table.Head>Max Length</Table.Head>
            <Table.Head>Action</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <!-- TODO: Fix -->
          {#each config.roas ?? [] as roa, index}
            <Table.Row>
              <Table.Cell>{roa.prefix}</Table.Cell>
              <Table.Cell>{roa.origin}</Table.Cell>
              <Table.Cell>
                {roa.max_length !== null && roa.max_length !== undefined
                  ? roa.max_length
                  : calcMaxLength(roa)}
              </Table.Cell>
              <Table.Cell>
                <!-- Dropdown menu for actions -->
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild let:builder>
                    <Button
                      variant="ghost"
                      builders={[builder]}
                      size="icon"
                      class="relative w-7 h-7 p-0">
                      <span class="sr-only">Open menu</span>
                      <MoreHorizontal class="w-4 h-4" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="center">
                    <DropdownMenu.Group>
                      <DropdownMenu.Label>Actions</DropdownMenu.Label>
                      <DropdownMenu.Item
                        on:click={() => {
                          selectedROA = roa;
                          selectedIndex = index;
                          selectedROACalculateLength =
                            selectedROA.max_length === null || selectedROA.max_length === undefined;
                          showEditROAModal = true;
                        }}>
                        <Pencil class="mr-2 size-4" />
                        <span>Edit</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        on:click={async () => {
                          // @ts-ignore
                          config.roas.splice(index, 1);
                          config.roas = config.roas;
                          // Update ROA validity
                          annROAStates = await getROAStates();
                        }}
                        class="text-destructive data-[highlighted]:text-destructive">
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

  <Accordion.Root value="item-1">
    <Accordion.Item value="item-1">
      <Accordion.Trigger class="text-sm pt-2">Diagram Details</Accordion.Trigger>
      <Accordion.Content class="overflow-visible">
        <div class="space-y-2 w-auto">
          <!-- Name -->
          <div>
            <label for="name" class="block text-sm font-medium leading-6 mb-2">Name</label>
            <Input type="text" bind:value={config.name} placeholder="Name" id="name" />
          </div>

          <!-- Description -->
          <div>
            <label for="desc" class="block text-sm font-medium leading-6 mb-2">Description</label>
            <Textarea placeholder="Description" bind:value={config.desc} />
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>
</form>
