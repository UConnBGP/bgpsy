<script lang="ts">
  import * as Table from './ui/table';
  import * as Dialog from './ui/dialog';
  import * as DropdownMenu from './ui/dropdown-menu';
  import * as Select from '$lib/components/ui/select';
  import { Input } from './ui/input';
  import { Label } from './ui/label';
  import { Button } from './ui/button';
  import { Checkbox } from './ui/checkbox';
  import type { Config, ROA } from '$lib/types';
  import type { DataSet, Node } from 'vis-network/standalone';
  import { toast } from 'svelte-sonner';
  import { parseCIDR, isValid } from 'ipaddr.js';
  import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-svelte';
  import { getAllASes } from '$lib/utils/as';
  import { createEmptyROA, getROAStates } from '$lib/utils';

  export let config: Config;
  export let nodes: DataSet<Node>;
  export let annROAStates: string[];

  let showAddROAModal = false;
  let showEditROAModal = false;

  let newROA = createEmptyROA();
  let newROACalcMaxLen = true;

  // These should never be null when used, but we're setting them here to please TS
  let selectedROA = createEmptyROA();
  let selectedROACalcMaxLen = true;
  let selectedROAIndex = -1;

  // Returns empty string if valid, error message if invalid
  function validateROA(roa: ROA, calcMaxLen: boolean): string {
    // ROA must be filled in
    if (roa.prefix === '') {
      return 'Prefix must be specified';
    }

    // Check if prefix is a valid IP address
    const prefixParts = roa.prefix.split('/');
    if (
      !(
        prefixParts.length === 2 &&
        prefixParts[0].split('.').length === 4 &&
        isValid(prefixParts[0])
      )
    ) {
      return `${roa.prefix} is not a valid IP address`;
    }

    // Check if prefix is a valid IP address
    try {
      const _ = parseCIDR(roa.prefix);
    } catch {
      return `${roa.prefix} is not a valid CIDR prefix`;
    }

    if (roa.origin === null) {
      return 'Origin ASN must be specified';
    }

    // Not sure why I have to do this, TODO: debug
    // roa.origin = Number(roa.origin);

    if (roa.origin < 0) {
      return 'Origin ASN cannot be negative';
    }

    // Check if max length is defined if calculate box is unchcked
    // @ts-expect-error: When reading from input, it returns a string instead of a number for some reason
    if (!calcMaxLen && (roa.max_length === null || roa.max_length === '')) {
      return 'Max length must be specified if it is not to be calculated';
    }

    // Not sure why I have to do this
    // TODO: debug
    // selectedROA.origin = Number(selectedROA.origin);

    // Set max length to either null or value from input
    roa.max_length = calcMaxLen ? null : Number(roa.max_length);

    if (roa.max_length !== null && roa.max_length < 0) {
      return 'Max length cannot be negative';
    }

    // TODO: Prevent duplicate
    // if ()

    console.log(roa);

    return '';
  }

  async function addROA() {
    if (config.roas === undefined) {
      config.roas = [];
    }

    const errorMsg = validateROA(newROA, newROACalcMaxLen);
    if (errorMsg !== '') {
      toast.error(errorMsg);
      return;
    }

    // Add ROA to array
    config.roas = [...config.roas, newROA];

    // Update ROA validity
    annROAStates = await getROAStates(config);

    // Reset state
    newROA = createEmptyROA();
    newROACalcMaxLen = true;
    showAddROAModal = false;
  }

  async function saveROA() {
    // We should never get here
    if (config.roas === undefined) {
      console.log(
        `error: roa array is undefined when editing roa ${
          (selectedROA.prefix, selectedROA.origin, selectedROA.max_length)
        }`
      );
      return;
    }

    const errorMsg = validateROA(selectedROA, selectedROACalcMaxLen);
    if (errorMsg !== '') {
      toast.error(errorMsg);
      return;
    }

    // Update ROA in array
    config.roas[selectedROAIndex] = selectedROA;

    // Update ROA validity
    annROAStates = await getROAStates(config);

    // Reset state
    selectedROA = createEmptyROA();
    selectedROACalcMaxLen = true;
    selectedROAIndex = -1;
    showEditROAModal = false;
  }

  async function deleteROA(index: number) {
    // We should never get here
    if (config.roas === undefined) {
      console.log('error: roas array is undefined when deleting roa');
      return;
    }

    // Delete ROA
    config.roas.splice(index, 1);
    config.roas = config.roas;

    // Update ROA validity
    annROAStates = await getROAStates(config);
  }

  function calcMaxLength(roa: ROA): number {
    // TODO: Add better check
    // We should never get here
    if (!roa.prefix.includes('/')) {
      return 0;
    }
    const parts = roa.prefix.split('/');
    return Number(parts[parts.length - 1]);
  }
</script>

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
        <!-- <Input bind:value={newROA.origin} type="number" class="col-span-2" /> -->
        <Select.Root
          selected={newROA.origin !== null
            ? { value: newROA.origin, label: String(newROA.origin) }
            : undefined}
          onSelectedChange={(selected) => {
            newROA.origin = selected === undefined ? newROA.origin : selected.value;
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
          bind:checked={newROACalcMaxLen}
          class="justify-self-end data-[state=checked]:bg-emerald-500 border-emerald-500" />
        <Label class="col-span-2 leading-normal">Use Prefix Length for Max Length</Label>
      </div>

      {#if !newROACalcMaxLen}
        <div class="grid grid-cols-3 items-center gap-4">
          <Label class="text-right">Max Length</Label>
          <Input bind:value={newROA.max_length} class="col-span-2" type="number" min={0} />
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
        <!-- <Input bind:value={selectedROA.origin} type="number" class="col-span-2" /> -->
        <Select.Root
          selected={selectedROA.origin !== null
            ? { value: selectedROA.origin, label: String(selectedROA.origin) }
            : undefined}
          onSelectedChange={(selected) => {
            selectedROA.origin = selected === undefined ? selectedROA.origin : selected.value;
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
        <Checkbox id="terms" bind:checked={selectedROACalcMaxLen} class="justify-self-end" />
        <Label class="col-span-2 leading-normal">Use Prefix Length for Max Length</Label>
      </div>
      {#if !selectedROACalcMaxLen}
        <div class="grid grid-cols-3 items-center gap-4">
          <Label class="text-right">Max Length</Label>
          <Input bind:value={selectedROA.max_length} class="col-span-2" type="number" min={0} />
        </div>
      {/if}
    </div>
    <Dialog.Footer>
      <Button on:click={() => (showEditROAModal = false)} variant="outline">Cancel</Button>
      <Button on:click={saveROA}>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- ROAs -->
{#if (config.scenario === null || config.scenario === 'customscenario') && config.roas !== undefined}
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
        {#each config.roas as roa, index}
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
                <DropdownMenu.Trigger>
                  <Button variant="ghost" size="icon" class="relative w-7 h-7 p-0">
                    <span class="sr-only">Open menu</span>
                    <MoreHorizontal class="w-4 h-4" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="center">
                  <DropdownMenu.Group>
                    <DropdownMenu.Label>Actions</DropdownMenu.Label>
                    <DropdownMenu.Item
                      on:click={() => {
                        selectedROA = structuredClone(roa);
                        selectedROAIndex = index;
                        selectedROACalcMaxLen =
                          selectedROA.max_length === null || selectedROA.max_length === undefined;
                        showEditROAModal = true;
                      }}>
                      <Pencil class="mr-2 size-4" />
                      <span>Edit</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      on:click={async () => await deleteROA(index)}
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
