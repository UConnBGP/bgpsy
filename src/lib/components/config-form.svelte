<script lang="ts">
  import { scenarioModifiers, scenarios, type Config } from '../types';
  import * as Accordion from '$lib/components/ui/accordion';
  import * as Select from '$lib/components/ui/select';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Input } from './ui/input';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { HelpCircle } from 'lucide-svelte';
  import type { DataSet, Node } from 'vis-network/standalone';
  import AnnouncementsTable from './announcements-table.svelte';
  import ROATable from './roa-table.svelte';

  export let config: Config;
  export let nodes: DataSet<Node>;
  export let annROAStates: string[];

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
