<script lang="ts">
  import { DataSet } from 'vis-network/standalone/esm/vis-network';
  import ConfigForm from '$lib/components/config-form.svelte';
  import Graph from '../lib/components/graph.svelte';
  import { type Config, exampleConfigsMap, exampleConfigsMap2 } from '$lib';
  import { exampleConfigs, getPropagationRanks, listToIndexJsonReversed } from '$lib';
  import CitationModal from '$lib/components/citation-modal.svelte';
  import ErrorBanner from '$lib/components/error-banner.svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';
  import Download from 'lucide-svelte/icons/download';
  import Loader2 from 'lucide-svelte/icons/loader-2';
  import Upload from 'lucide-svelte/icons/upload';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import * as Accordion from '$lib/components/ui/accordion';
  import { cn, getROAStates2 } from '$lib/utils';
  import Bug from 'lucide-svelte/icons/bug';
  import { toast } from 'svelte-sonner';

  // State
  let nodes = new DataSet([]);
  let edges = new DataSet([]);
  let config: Config = {
    name: '',
    desc: '',
    scenario: null,
    announcements: [],
    roas: []
    // propagation_rounds: 1
  };
  let policyMap: Record<number, string> = {};
  let roleMap: Record<number, string> = {};

  let imageURL = '';
  let prevConfig: Config | null = null;
  let fileInput: HTMLInputElement; // Reference to the hidden file input
  let submitPressed;
  let isImageOpen = false;
  let isDropdownOpen = false;
  let simulationResults: {} | null = null;
  let cpLinks: number[][] = [];
  let peerLinks: number[][] = [];
  let showInfo = false;
  let showBanner = false;
  let errorMessage = '';
  let isLoading: boolean = false;
  let showAddASModal = false;
  let showClearGraphModal = false;
  let graphComponent: Graph;
  let annROAStates: string[];
  let graphLoadingState = '';

  onMount(async () => {
    if (!exampleConfigsMap2[$page.url.hash]) {
      loadExampleConfig(exampleConfigs['Subprefix Hijack with Custom Announcements']);
    }
  });

  $: if ($page.url.searchParams.has('link')) {
    const link = $page.url.searchParams.get('link');
    if (link) {
      fetchConfig(link);
    }
  }

  // Handle jump link
  $: if (exampleConfigsMap2[$page.url.hash]) {
    // console.log($page.url.hash);
    loadExampleConfig(exampleConfigs[exampleConfigsMap2[$page.url.hash]]);
  }

  async function fetchConfig(url: string) {
    try {
      const response = await fetch(url);
      console.log(url);
      if (!response.ok) {
        showBanner = true;
        errorMessage = 'Network response was not ok';
        console.log(response.status);
        return;
      }
      config = await response.json();
      generateGraph(config);
    } catch (err) {
      showBanner = true;
      errorMessage = 'Failed to download JSON from link';
    }

    // Reset simulation results
    simulationResults = null;
  }

  function loadConfig(event: Event) {
    // Stupid type safety check for TypeScript
    if (
      !(event.target instanceof HTMLInputElement) ||
      event.target.files === null ||
      event.target.files.length === 0
    ) {
      return;
    }

    // Read file as JSON and store it in config
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      // Another type check
      if (e.target === null || typeof e.target.result !== 'string') {
        return;
      }

      config = JSON.parse(e.target.result);
      generateGraph(config);

      // Emit message to graph
      graphLoadingState = 'file';
    };
    reader.readAsText(file);

    // Reset fileInput so that we can load same file if needed
    fileInput.value = '';

    // Reset simulation results
    simulationResults = null;
  }

  async function loadExampleConfig(example: Config) {
    config = structuredClone(example);
    generateGraph(config);
    simulationResults = null;
    isDropdownOpen = false;
    graphLoadingState = 'example';

    // Update ROA validity
    annROAStates = await getROAStates2(config.announcements, config.roas);
  }

  function generateGraph(data: Config) {
    // Reset nodes and edges
    nodes.clear();
    edges.clear();

    if (data.announcements === undefined) {
      data.announcements = [];
    }

    if (data.roas === undefined) {
      data.roas = [];
    }

    if (data.attacker_asns === undefined) {
      data.attacker_asns = [];
    }

    if (data.victim_asns === undefined) {
      data.victim_asns = [];
    }

    if (data.graph === undefined) {
      // network.setData;
      return;
    }

    if (data.scenario === undefined) {
      data.scenario = null;
    }

    let levels: {};
    // console.log(data.graph.propagation_ranks);
    if (data.graph?.propagation_ranks) {
      // Reverse and turn it into a map
      levels = listToIndexJsonReversed(data.graph.propagation_ranks);
      console.log('listToIndexJSON', levels);
    } else {
      levels = getPropagationRanks(data.graph);
    }

    policyMap = data.asn_policy_map || {};

    // Set role map
    for (const attacker of data.attacker_asns) {
      roleMap[attacker] = 'attacker';
    }
    for (const victim of data.victim_asns) {
      roleMap[victim] = 'victim';
    }
    console.log(roleMap);

    // console.log(policyMap);

    // Update links after loading from file
    cpLinks = [];
    data.graph.cp_links.forEach((arr) => {
      cpLinks = [...cpLinks, [arr[0], arr[1]]];
    });
    peerLinks = [];
    data.graph.peer_links.forEach((arr) => {
      peerLinks = [...peerLinks, [arr[0], arr[1]]];
    });
    // console.log('load from file', cpLinks, peerLinks);

    // Generate nodes
    const allAsns = new Set([
      ...data.attacker_asns,
      ...data.victim_asns,
      ...data.graph.peer_links.flat(),
      ...data.graph.cp_links.flat()
    ]);
    allAsns.forEach((asn) => {
      let node = {
        id: asn,
        label: String(asn),
        level: levels[asn] || 1 // Default level to 1 if not calculated,
        // policy: asn in policyMap && policyMap[asn] // If it exists
        // color: data.attacker_asns.includes(asn)
        //   ? 'red'
        //   : data.victim_asns.includes(asn)
        //     ? 'green'
        //     : 'blue'
      };
      if (asn in policyMap) {
        node.policy = policyMap[asn].toLowerCase();
        //   if (
        //     node.policy === 'rov' ||
        //     node.policy === 'aspa' ||
        //     node.policy === 'bgpsec' ||
        //     node.policy === 'otc' ||
        //     node.policy === 'pathend'
        //   ) {
        //     node.shape = 'hexagon';
        //   }
      }
      if (data.victim_asns?.includes(asn)) {
        node.role = 'victim';
        const colorProp = { border: '#047857', background: '#34d399' };
        node.color = { ...colorProp, highlight: colorProp, hover: colorProp };
      } else if (data.attacker_asns?.includes(asn)) {
        node.role = 'attacker';
        const colorProp = { border: '#b91c1c', background: '#f87171' };
        node.color = { ...colorProp, highlight: colorProp, hover: colorProp };
      }
      nodes.add(node);
    });

    // Generate peer and cp_links as edges
    data.graph.peer_links.forEach((link) => {
      edges.add({
        from: link[0],
        to: link[1],
        dashes: true,
        width: 2,
        arrows: 'to, from'
      });
    });
    data.graph.cp_links.forEach((link) => {
      edges.add({
        from: link[0],
        to: link[1],
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8
          }
        }
      });
    });
  }

  function addGraphToConfig() {
    // Generate graph, victim ASNs, attacker ASNs, and ASN policy map for the config from the nodes and edges data sets

    const attackerASNs = [];
    const victimASNs = [];
    const asnPolicyMap = {};

    // Process nodes to fill attacker/victim ASNs and ASN policies
    nodes.forEach((node) => {
      if (node.role === 'attacker') {
        attackerASNs.push(node.id);
      } else if (node.role === 'victim') {
        victimASNs.push(node.id);
      }

      if (
        // node.policy === 'bgp' ||
        node.policy == 'rov' ||
        node.policy == 'aspa' ||
        node.policy == 'bgpsec' ||
        node.policy == 'pathend' ||
        node.policy == 'otc'
      ) {
        asnPolicyMap[node.id] = node.policy;
      }
    });

    let propagationRounds = 1;
    if (config.scenario === 'AccidentalRouteLeak') {
      propagationRounds = 2;
    }

    config = {
      ...config,
      attacker_asns: attackerASNs,
      victim_asns: victimASNs,
      asn_policy_map: asnPolicyMap,
      propagation_rounds: propagationRounds,
      graph: {
        // TODO: Figure out how to handle prop ranks
        // ...config.graph,
        cp_links: cpLinks,
        peer_links: peerLinks
      }
    };
  }

  async function handleSubmit() {
    // if (!submitPressed) {
    //   imageURL = null;
    //   return Promise.resolve();
    // }
    showBanner = false; // Reset error state on each submission
    isLoading = true;
    addGraphToConfig();
    // console.log(cpLinks, peerLinks);
    // console.log(config.graph?.cp_links, config.graph?.peer_links);
    try {
      const responseJSON = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      const response = await fetch('/api/simulate?include_diagram=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        showBanner = true;
        // Get error message
        const error = await response.json();
        if (response.status === 429) {
          errorMessage = error.error;
        } else if (error) {
          const msg = error.detail[0].msg;
          if (msg.includes('Value error, ')) {
            errorMessage = msg.replace('Value error, ', '');
          } else {
            errorMessage = msg;
          }
        } else {
          errorMessage = 'Failed to run simulation';
        }

        isLoading = false;
        imageURL = '';
        return;
      }

      let blob = await response.blob();

      simulationResults = await responseJSON.json();
      // console.log(simulationResults);
      const outcome = simulationResults.outcome;
      const local_ribs = simulationResults.local_ribs;
      // console.log(outcome);

      prevConfig = config; // Save for downloading zip
      imageURL = URL.createObjectURL(blob);

      nodes.forEach((node) => {
        let color: {} = node.color;
        if (config.attacker_asns?.includes(node.id)) {
          color = { border: '#b91c1c', background: '#f87171' };
        } else if (config.victim_asns?.includes(node.id)) {
          color = { border: '#047857', background: '#34d399' };
        }

        if (outcome[node.id] === 0 && !config.attacker_asns?.includes(node.id)) {
          // Attacker success
          color = { border: '#ea580c', background: '#f59e0b' };
        } else if (outcome[node.id] === 1 && !config.victim_asns?.includes(node.id)) {
          // Victim success
          color = { border: '#16a34a', background: '#86efac' };
        } else if (outcome[node.id] === 2) {
          // Disconnected
          color = { border: '#737373', background: '#d4d4d4' };
        }
        // console.log(outcome[node.id]);
        // nodes.update({ ...node, color: color });
        nodes.update({ ...node, color: { ...color, highlight: color, hover: color } });
      });
    } catch (error) {
      showBanner = true;
      errorMessage = 'Internal server error';
      imageURL = '';
      // console.error('Error running submission:', error);
    }

    isLoading = false;
  }

  function onFileButtonClicked() {
    fileInput.click(); // Trigger click on the actual file input
  }

  async function downloadZip() {
    try {
      const response = await fetch('/api/simulate?download_zip=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(prevConfig) // Use previous since that's we submitted
      });
      let blob = await response.blob();
      let url = URL.createObjectURL(blob);

      // Create a link element, set its href and download attributes, and click it to start download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'output.zip'; // Set the file name for the download
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error fetching zip:', error);
    }
  }

  function downloadConfig() {
    addGraphToConfig();
    const configJson = JSON.stringify(config, null, 2); // Convert config object to JSON string
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create a temporary link to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name || 'config'}.json`; // Name file after config name
    document.body.appendChild(a);
    a.click();

    // Cleanup
    URL.revokeObjectURL(url);
    a.remove();
  }

  // TODO: Change this logic
  $: if (showBanner && errorMessage !== '') {
    toast.error(errorMessage);
  }

  // Drag functionality
  let firstColumn, mainColumn;
  let startX, startWidth, containerWidth;
  let dragging = false;

  function startDrag(e) {
    startX = e.clientX;
    startWidth = firstColumn.offsetWidth;
    containerWidth = mainColumn.offsetWidth;
    dragging = true;
    document.addEventListener('mousemove', doDrag, false);
    document.addEventListener('mouseup', stopDrag, false);
  }

  function doDrag(e) {
    const newWidth = startWidth + e.clientX - startX;
    console.log(containerWidth);

    if (newWidth < containerWidth / 3.5) {
      return;
    } else if (newWidth > containerWidth / 2) {
      return;
    }
    firstColumn.style.width = newWidth + 'px';
  }

  function stopDrag(e) {
    document.removeEventListener('mousemove', doDrag, false);
    document.removeEventListener('mouseup', stopDrag, false);
    dragging = false;
  }
</script>

<svelte:head>
  <title>BGPy</title>
</svelte:head>

<main bind:this={mainColumn} class={cn('w-full mx-auto p-8', dragging ? 'select-none' : '')}>
  <div class="flex flex-row justify-between mb-4">
    <div class="flex items-baseline space-x-2 justify-start">
      <h1 class="text-4xl font-semibold">BGPy Editor</h1>

      <!-- <p class="font-medium">
        An interface for
        <a
          href="https://github.com/jfuruness/bgpy_pkg/wiki"
          target="_blank"
          class="hover:font-semibold hover:underline">BGPy</a>
      </p> -->
    </div>

    <!-- Link and citation buttons -->
    <div class="flex justify-end items-center">
      <a
        href="https://github.com/jfuruness/bgpy_pkg/wiki"
        target="_blank"
        class="p-2 rounded-full hover:bg-gray-200">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path
            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      </a>
      <a
        href="https://github.com/Arvonit/bgpsy/issues"
        target="_blank"
        class="p-2 rounded-full hover:bg-gray-200">
        <Bug class="size-6" />
      </a>
      <button on:click={() => (showInfo = true)} class="p-2 rounded-full hover:bg-gray-200">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path
            d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Banner for errors -->
  <!-- <ErrorBanner message={errorMessage} bind:open={showBanner} class="mb-4" /> -->

  <!-- Two columns for form and graph -->
  <div class="flex md:flex-row flex-col md:space-x-4">
    <!-- class="basis-1/3 md:order-1 order-2" -->
    <!-- w-full might not do anything -->
    <div bind:this={firstColumn} class="order-2 md:order-1 w-full md:w-[33vw] md:resizable">
      <!-- Examples dropdown -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild let:builder>
          <Button builders={[builder]} class="mb-4 bg-indigo-500 hover:bg-indigo-500/90" size="sm">
            Examples
            <ChevronDown class="ml-2 size-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {#each Object.keys(exampleConfigs) as configName}
            <DropdownMenu.Item
              href={'#' + exampleConfigsMap[configName]}
              on:click={() => {
                // loadExampleConfig(exampleConfigs[configName])
              }}>
              {configName}
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <ConfigForm bind:annROAStates {config} bind:roleMap />

      <div class="mt-4 flex flex-col space-y-2">
        <!-- Submit button -->
        <Button on:click={handleSubmit} class="bg-sky-500 hover:bg-sky-500/90">
          {#if isLoading}
            <Loader2 class="mr-2 size-4 animate-spin" />
          {/if}
          Simulate
        </Button>

        <div class="flex flex-row justify-between">
          <input
            bind:this={fileInput}
            on:change={loadConfig}
            type="file"
            accept="application/json"
            class="hidden" />
          <!-- Load config button -->
          <Button
            class="bg-sky-500 hover:bg-sky-500/90 mr-2 flex-grow"
            on:click={onFileButtonClicked}>
            <Upload class="mr-2 size-4" />
            Load Config
          </Button>

          <!-- Download config button -->
          <Button
            type="submit"
            class="bg-sky-500 hover:bg-sky-500/90 flex-grow"
            on:click={downloadConfig}>
            <Download class="mr-2 size-4" />
            Download Config
          </Button>
        </div>

        <!-- Download zip button -->
        <Button
          on:click={downloadZip}
          class="bg-sky-500 hover:bg-sky-500/90"
          disabled={imageURL === ''}>
          <Download class="mr-2 size-4" />
          Download Results Zip
        </Button>
      </div>
    </div>

    <!-- <div class="overflow-hidden resize-x min-w-[33vw] max-w-[33vw]"></div> -->
    <div class="resizer order-2 md:visible invisible bg-neutral-100" on:mousedown={startDrag}></div>

    <div class="basis-2/3 order-1 md:order-2">
      <Graph
        {nodes}
        {edges}
        bind:simulationResults
        bind:this={graphComponent}
        bind:showModal={showAddASModal}
        bind:showClearGraphModal
        bind:cpLinks
        bind:peerLinks
        bind:roleMap
        bind:policyMap
        bind:imageURL
        bind:graphLoadingState
        bind:isLoading
        {handleSubmit} />
    </div>
  </div>

  <!-- Diagram accordion -->
  {#if imageURL}
    <Accordion.Root class="mt-4">
      <Accordion.Item value="item-1">
        <Accordion.Trigger>Diagram</Accordion.Trigger>
        <Accordion.Content>
          <p><img src={imageURL} alt="System diagram" /></p>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  {/if}

  <CitationModal bind:showModal={showInfo} on:close={() => (showInfo = false)} />
</main>

<style>
  .resizable {
    overflow: hidden;
    resize: horizontal;
    min-width: 33%;
    max-width: 100%;
  }
  .resizer {
    cursor: ew-resize;
    width: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .resizer::after {
    content: '||';
    font-size: 12px;
    display: block;
  }
</style>
