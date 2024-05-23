<script lang="ts">
  import { scenarioModifiers, scenarios, type Config } from '../types';
  import * as Accordion from '$lib/components/ui/accordion';
  import * as Select from '$lib/components/ui/select';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Button } from '$lib/components/ui/button';
  import { Input } from './ui/input';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { Download, HelpCircle, Loader2, Upload } from 'lucide-svelte';
  import type { DataSet, Node } from 'vis-network/standalone';
  import AnnouncementsTable from './announcements-table.svelte';
  import ROATable from './roa-table.svelte';

  export let config: Config;
  export let nodes: DataSet<Node>;
  export let annROAStates: string[];
  export let showLoadingSpinner: boolean;
  export let showDownloadZip: boolean;
  export let onSimulate: () => Promise<void>;
  export let onLoadConfig: (event: Event) => Promise<void>;
  export let onDownloadConfig: () => void;
  export let onDownloadZip: () => Promise<void>;

  let fileInput: HTMLInputElement; // Reference to the hidden file input

  // function setROAStates() {
  //   getROAStates(config).then((arr) => (annROAStates = arr));
  // }

  // Update ROA validity every time announcements and ROAs are changed
  // $: if (config.announcements || config.roas) {
  //   console.log('updated');
  //   setROAStates();
  // }

  function updateScenario() {
    if (config.scenario !== null && config.scenario !== 'customscenario') {
      config.announcements = [];
      config.roas = [];
    } else {
      // By default, create an announcement and ROA with the victim (if it exists)
      const victims = config.victim_asns;

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
  }
</script>

<!-- Form -->
<div>
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
              Choose a predefined scenario or build your own with <br />custom announcements and
              ROAs
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>

      <Select.Root
        selected={{
          value: config.scenario !== null ? config.scenario.toLowerCase() : null,
          label: config.scenario !== null ? scenarios[config.scenario] : 'Custom Scenario'
        }}
        onSelectedChange={(selected) => {
          if (config.scenario === selected?.value) {
            return;
          }
          config.scenario = selected === undefined ? null : selected.value;
          updateScenario();
        }}>
        <Select.Trigger>
          <Select.Value placeholder="Select a scenario" />
        </Select.Trigger>
        <Select.Content>
          {#each Object.entries(scenarios) as [value, label]}
            <Select.Item {value}>{label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Show attack modifier when custom scenario is selected -->
    {#if config.scenario !== null && config.scenario !== 'customscenario' && config.scenario !== 'validprefix' && config.scenario !== 'accidentalrouteleak'}
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

        <Select.Root
          selected={{
            value:
              config.scenario_modifier !== null && config.scenario_modifier !== undefined
                ? config.scenario_modifier.toLowerCase()
                : null,
            label:
              config.scenario_modifier !== null && config.scenario_modifier !== undefined
                ? scenarioModifiers[config.scenario_modifier]
                : 'None'
          }}
          onSelectedChange={(selected) => {
            config.scenario_modifier = selected === undefined ? null : selected.value;
          }}>
          <Select.Trigger>
            <Select.Value placeholder="Select a modifier" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value={null}>None</Select.Item>
            {#each Object.entries(scenarioModifiers) as [value, label]}
              <Select.Item {value}>{label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    {/if}

    <!-- Announcements -->
    <AnnouncementsTable bind:config {nodes} bind:annROAStates />

    <!-- ROAs -->
    <ROATable bind:config {nodes} bind:annROAStates />

    <!-- Diagram details -->
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

  <!-- Submit buttons -->
  <div class="mt-4 flex flex-col space-y-2">
    <!-- Submit button -->
    <Button on:click={onSimulate} class="bg-sky-500 hover:bg-sky-500/90">
      {#if showLoadingSpinner}
        <Loader2 class="mr-2 size-4 animate-spin" />
      {/if}
      Simulate
    </Button>

    <div class="flex flex-row justify-between overflow-scroll">
      <input
        bind:this={fileInput}
        on:change={onLoadConfig}
        type="file"
        accept="application/json"
        class="hidden" />
      <!-- Load config button -->
      <Button
        class="bg-sky-500 hover:bg-sky-500/90 mr-2 flex-grow"
        on:click={() => fileInput.click()}>
        <Upload class="mr-2 size-4" />
        Load Config
      </Button>

      <!-- Download config button -->
      <Button
        type="submit"
        class="bg-sky-500 hover:bg-sky-500/90 flex-grow"
        on:click={onDownloadConfig}>
        <Download class="mr-2 size-4" />
        Download Config
      </Button>
    </div>

    <!-- Download zip button -->
    <Button
      on:click={onDownloadZip}
      class="bg-sky-500 hover:bg-sky-500/90"
      disabled={showDownloadZip}>
      <Download class="mr-2 size-4" />
      Download Results Zip
    </Button>
  </div>
</div>
