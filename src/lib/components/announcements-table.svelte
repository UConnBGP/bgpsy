<script lang="ts">
  import * as Table from './ui/table';
  import * as Dialog from './ui/dialog';
  import * as DropdownMenu from './ui/dropdown-menu';
  import * as Select from '$lib/components/ui/select';
  import { Input } from './ui/input';
  import { Label } from './ui/label';
  import { Button } from './ui/button';
  import { Checkbox } from './ui/checkbox';
  import type { Announcement, Config, ROA } from '$lib/types';
  import type { DataSet, Node } from 'vis-network/standalone';
  import { toast } from 'svelte-sonner';
  import { parseCIDR, isValid } from 'ipaddr.js';
  import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-svelte';
  import { getAllASes } from '$lib/utils/as';
  import { createEmptyAnnouncement, getROAStates } from '$lib/utils';

  export let config: Config;
  export let nodes: DataSet<Node>;
  export let annROAStates: string[];

  let showAddAnnouncementModal = false;
  let showEditAnnouncementModal = false;

  let newAnn = createEmptyAnnouncement();
  let newAnnAutoDefineASPath = true;
  let newAnnAutoDefineROA = true;

  // These should never be null when used, but we're setting them here to please TS
  let selectedAnn = createEmptyAnnouncement();
  let selectedAnnIndex = -1;

  // Returns empty string if valid, error message if invalid
  function validateAnnouncement(ann: Announcement, autoDefineASPath: boolean): string {
    // Prefix must be specified
    if (ann.prefix === '') {
      return 'Prefix is not specified';
    }

    // Check if prefix is a valid IP address
    const prefixParts = ann.prefix.split('/');
    if (
      !(
        prefixParts.length === 2 &&
        prefixParts[0].split('.').length === 4 &&
        isValid(prefixParts[0])
      )
    ) {
      return `${ann.prefix} is not a valid IP address`;
    }

    // Check if prefix is a valid CIDR prefix
    try {
      const _ = parseCIDR(ann.prefix);
    } catch {
      return `${ann.prefix} is not a valid CIDR prefix`;
    }

    // Seed ASN must be populated
    if (ann.seed_asn === null) {
      return 'Announced by ASN is not specified';
    }

    if (ann.seed_asn < 0) {
      return 'Announced by ASN cannot be negative';
    }

    // TODO: Consider checking if delimiter is either comma or dash
    // AS path must be populated
    if (!autoDefineASPath && ann.as_path.length === 0) {
      return 'AS Path cannot be empty';
    }

    // Ensure AS Path contains ASes in graph
    const allASes = getAllASes(nodes);
    for (const asn of ann.as_path) {
      if (!allASes.includes(asn)) {
        return `AS Path contains ${asn}, which is not an AS on the graph`;
      }
    }

    return '';
  }

  async function addAnnouncement() {
    if (config.announcements === undefined) {
      config.announcements = [];
    }

    const errorMsg = validateAnnouncement(newAnn, newAnnAutoDefineASPath);
    if (errorMsg !== '') {
      toast.error(errorMsg);
      return;
    }

    // Populate AS path with just seed ASN
    if (newAnnAutoDefineASPath) {
      // @ts-expect-error: We check this in `validateAnnouncement`
      newAnn.as_path.push(newAnn.seed_asn);
    }

    // Prevent duplicate announcement
    const isDuplicate = config.announcements.some(
      (ann) =>
        ann.prefix === newAnn.prefix &&
        ann.seed_asn === newAnn.seed_asn &&
        ann.as_path.length === newAnn.as_path.length &&
        ann.as_path.every((value, index) => value === newAnn.as_path[index])
    );
    if (isDuplicate) {
      toast.error('This announcement already exists');
      // Reset AS path field
      if (newAnnAutoDefineASPath) {
        newAnn.as_path = [];
      }
      return;
    }

    // Create corresponding valid ROA
    if (newAnnAutoDefineROA) {
      const roa: ROA = {
        prefix: newAnn.prefix,
        origin: newAnn.seed_asn,
        max_length: null
      };

      // Add to ROAs array
      if (config.roas === undefined) {
        config.roas = [];
      }
      config.roas = [...config.roas, roa];
    }

    // Add announcement to array
    config.announcements = [...config.announcements, newAnn];

    // Update ROA validity
    annROAStates = await getROAStates(config);

    // Reset state
    newAnn = createEmptyAnnouncement();
    newAnnAutoDefineASPath = true;
    newAnnAutoDefineROA = true;
    showAddAnnouncementModal = false;
  }

  async function saveAnnouncement() {
    // We should never get here
    if (config.announcements === undefined) {
      console.log(
        `error: announcements array is undefined when editing announcement ${
          (selectedAnn.prefix, selectedAnn.seed_asn)
        }`
      );
      return;
    }

    const errorMsg = validateAnnouncement(selectedAnn, false);
    if (errorMsg !== '') {
      toast.error(errorMsg);
      return;
    }

    // Update announcement in array
    config.announcements[selectedAnnIndex] = selectedAnn;

    // Update ROA validity
    annROAStates = await getROAStates(config);

    // Reset state
    selectedAnn = createEmptyAnnouncement();
    selectedAnnIndex = -1;
    showEditAnnouncementModal = false;
  }

  async function deleteAnnouncement(index: number) {
    // We should never get here
    if (config.announcements === undefined) {
      console.log('error: announcements array is undefined when deleting announcement');
      return;
    }

    // Delete announcement
    config.announcements.splice(index, 1);
    config.announcements = config.announcements;

    // Update ROA validity
    annROAStates = await getROAStates(config);
  }

  function updateASPath(ann: Announcement, value: string) {
    ann.as_path = value
      .split(/,|-/) // Split by either comma or comma
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
        <Input bind:value={newAnn.prefix} class="col-span-2" />
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">Announced by ASN</Label>
        <Select.Root
          selected={newAnn.seed_asn !== null
            ? { value: newAnn.seed_asn, label: String(newAnn.seed_asn) }
            : undefined}
          onSelectedChange={(selected) => {
            newAnn.seed_asn = selected === undefined ? newAnn.seed_asn : selected.value;
            // updateProvider(index, newASN);
          }}>
          <Select.Trigger class="col-span-2">
            <Select.Value placeholder="Select an AS" />
          </Select.Trigger>
          <Select.Content>
            {#each getAllASes(nodes) as asn}
              <Select.Item value={asn}>{asn}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="grid grid-cols-3 items-center gap-4 my-1">
        <Checkbox
          id="terms"
          bind:checked={newAnnAutoDefineASPath}
          class="justify-self-end data-[state=checked]:bg-emerald-500 border-emerald-500" />
        <Label class="col-span-2">Define AS Path</Label>
      </div>

      {#if !newAnnAutoDefineASPath}
        <div class="grid grid-cols-3 items-center gap-4">
          <Label class="text-right">AS Path</Label>
          <Input
            value={newAnn.as_path.join(', ')}
            class="col-span-2"
            on:input={(e) => {
              // @ts-expect-error: EventTarget is annoying
              updateASPath(newAnn, e.target.value);
            }} />
        </div>
      {/if}

      <div class="grid grid-cols-3 items-center gap-4 my-1">
        <Checkbox
          id="terms"
          bind:checked={newAnnAutoDefineROA}
          class="justify-self-end data-[state=checked]:bg-emerald-500 border-emerald-500" />
        <Label class="col-span-2 leading-normal">Define Corresponding ROA</Label>
      </div>
    </div>
    <Dialog.Footer>
      <Button on:click={addAnnouncement} class="bg-emerald-500 hover:bg-emerald-500">Add</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Edit Announcement Modal -->
<Dialog.Root bind:open={showEditAnnouncementModal}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Edit Announcement</Dialog.Title>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">Prefix</Label>
        <Input bind:value={selectedAnn.prefix} class="col-span-2" />
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">Announced by ASN</Label>
        <!-- <Input bind:value={selectedAnnouncement.seed_asn} type="number" class="col-span-2" /> -->
        <Select.Root
          selected={selectedAnn.seed_asn !== null
            ? { value: selectedAnn.seed_asn, label: String(selectedAnn.seed_asn) }
            : undefined}
          onSelectedChange={(selected) => {
            selectedAnn.seed_asn = selected === undefined ? selectedAnn.seed_asn : selected.value;
          }}>
          <Select.Trigger class="col-span-2">
            <Select.Value placeholder="Select an AS" />
          </Select.Trigger>
          <Select.Content>
            {#each getAllASes(nodes) as asn}
              <Select.Item value={asn}>{asn}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label class="text-right">AS Path</Label>
        <Input
          value={selectedAnn.as_path.join(', ')}
          class="col-span-2"
          on:input={(e) => {
            // @ts-expect-error: EventTarget is annoying
            updateASPath(selectedAnn, e.target.value);
          }} />
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

<!-- Announcements Table -->
{#if (config.scenario === null || config.scenario === 'customscenario') && config.announcements !== undefined}
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
                        selectedAnn = structuredClone(announcement);
                        selectedAnnIndex = index;
                        showEditAnnouncementModal = true;
                      }}>
                      <Pencil class="mr-2 size-4" />
                      <span>Edit</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      on:click={async () => await deleteAnnouncement(index)}
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
