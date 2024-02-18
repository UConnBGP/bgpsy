<script lang="ts">
  import { DataSet } from 'vis-network/standalone/esm/vis-network';
  import ConfigForm from '../components/config-form.svelte';
  import Graph from '../components/graph.svelte';
  import { USE_FILE_MENU, type Config } from '$lib';
  import { exampleConfigs, getPropagationRanks, listToIndexJsonReversed } from '$lib';
  import CitationModal from '../components/citation-model.svelte';
  import ErrorBanner from '../components/error-banner.svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    ChevronDown,
    Download,
    Loader2,
    Upload,
    ArrowDownToLine,
    Save,
    FolderClosed,
    Plus,
    Ban
  } from 'lucide-svelte';
  import { Button } from '../lib/components/ui/button';
  import * as DropdownMenu from '../lib/components/ui/dropdown-menu';
  import * as Menubar from '../lib/components/ui/menubar';

  // State
  let nodes = new DataSet([]);
  let edges = new DataSet([]);
  let config: Config = {
    name: '',
    desc: '',
    scenario: null,
    announcements: []
    // propagation_rounds: 1
  };

  let imageURL = '';
  let prevConfig: Config | null = null;
  let fileInput; // Reference to the hidden file input
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

  onMount(() => {
    loadExampleConfig(exampleConfigs['Subprefix Hijack with Custom Announcements']);
  });

  $: if ($page.url.searchParams.has('link')) {
    const link = $page.url.searchParams.get('link');
    if (link) {
      fetchConfig(link);
    }
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

  function loadConfig(event) {
    const file = event.target.files[0];
    // console.log(file);
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        config = JSON.parse(e.target.result);
        generateGraph(config);
        // console.log(config);
      };
      reader.readAsText(file);
    }
    fileInput.value = '';

    // Reset simulation results
    simulationResults = null;
  }

  function loadExampleConfig(example: Config) {
    config = example;
    generateGraph(config);
    simulationResults = null;
    isDropdownOpen = false;
  }

  function generateGraph(data: Config) {
    // Reset nodes and edges
    nodes.clear();
    edges.clear();

    if (data.announcements === undefined) {
      data.announcements = [];
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

    const policyMap = data.asn_policy_map || {};

    // Update links after loading from file
    cpLinks = [];
    data.graph.cp_links.forEach((arr) => {
      cpLinks = [...cpLinks, [arr[0], arr[1]]];
    });
    peerLinks = [];
    data.graph.peer_links.forEach((arr) => {
      peerLinks = [...peerLinks, [arr[0], arr[1]]];
    });
    console.log('load from file', cpLinks, peerLinks);

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
        if (
          node.policy === 'rov' ||
          node.policy === 'aspa' ||
          node.policy === 'bgpsec' ||
          node.policy === 'otc' ||
          node.policy === 'pathend'
        ) {
          node.shape = 'square';
        }
      }
      if (data.base_policy === 'ROVSimplePolicy') {
        node.shape = 'square';
      }
      if (data.victim_asns?.includes(asn)) {
        node.role = 'victim';
        node.color = { border: '#047857', background: '#34d399' };
      } else if (data.attacker_asns?.includes(asn)) {
        node.role = 'attacker';
        node.color = { border: '#b91c1c', background: '#f87171' };
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
        node.policy === 'bgp' ||
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
        ...config.graph,
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
    console.log(cpLinks, peerLinks);
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
        if (error) {
          errorMessage = error.detail[0].msg;
          if (errorMessage.includes('Value error, ')) {
            errorMessage = errorMessage.replace('Value error, ', '');
          }
        } else {
          errorMessage = 'Failed to run simulation';
        }

        isLoading = false;
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
        console.log(outcome[node.id]);
        nodes.update({ ...node, color: color });
      });
    } catch (error) {
      showBanner = true;
      errorMessage = 'Failed to connect to the server';
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
    a.download = 'config.json'; // Name of the file to be downloaded
    document.body.appendChild(a);
    a.click();

    // Cleanup
    URL.revokeObjectURL(url);
    a.remove();
  }
</script>

<svelte:head>
  <title>BGPy</title>
</svelte:head>

<main class="container mx-auto px-4 py-4">
  <h1 class="text-4xl font-semibold mb-4">
    <a href="https://github.com/jfuruness/bgpy_pkg/wiki" target="_blank">BGPy</a>
  </h1>

  <!-- File Menu -->
  {#if USE_FILE_MENU}
    <Menubar.Root class="mb-4">
      <Menubar.Menu>
        <Menubar.Trigger>File</Menubar.Trigger>
        <Menubar.Content>
          <Menubar.Item on:click={onFileButtonClicked}>
            <FolderClosed class="mr-2 h-4 w-4" />
            <span>Open Config</span>
          </Menubar.Item>
          <Menubar.Item on:click={downloadConfig}>
            <Save class="mr-2 h-4 w-4" />
            <span>Save Config</span>
          </Menubar.Item>
          <Menubar.Separator />
          <Menubar.Item disabled={imageURL === ''} on:click={downloadZip}>
            <Download class="mr-2 h-4 w-4" />
            <span>Download Results Zip</span>
          </Menubar.Item>
        </Menubar.Content>
      </Menubar.Menu>

      <Menubar.Menu>
        <Menubar.Trigger>Graph</Menubar.Trigger>
        <Menubar.Content>
          <Menubar.Item on:click={() => (showAddASModal = true)}>
            <!-- <Plus class="mr-2 h-4 w-4" /> -->
            <span>Add AS</span>
          </Menubar.Item>
          <Menubar.Item on:click={graphComponent.addCPLink}>
            <!-- <Plus class="mr-2 h-4 w-4" /> -->
            <span>Add Customer-Provider Link</span>
          </Menubar.Item>
          <Menubar.Item on:click={graphComponent.addPeerLink}>
            <!-- <Plus class="mr-2 h-4 w-4" /> -->
            <span>Add Peer Link</span>
          </Menubar.Item>
          <Menubar.Separator />
          <Menubar.Item on:click={() => (showClearGraphModal = true)}>
            <Ban class="mr-2 h-4 w-4" />
            <span>Clear Graph</span>
          </Menubar.Item>
        </Menubar.Content>
      </Menubar.Menu>

      <Menubar.Menu>
        <Menubar.Trigger>Examples</Menubar.Trigger>
        <Menubar.Content>
          {#each Object.keys(exampleConfigs) as configName}
            <Menubar.Item on:click={() => loadExampleConfig(exampleConfigs[configName])}>
              {configName}
            </Menubar.Item>
          {/each}
        </Menubar.Content>
      </Menubar.Menu>
    </Menubar.Root>
  {/if}

  <ErrorBanner message={errorMessage} bind:showBanner />

  <!-- Two columns for form and graph -->
  <div class="flex md:flex-row flex-col space-x-4">
    <div class="basis-1/2 order-2 md:order-1">
      <!-- Examples dropdown -->
      <!-- <div class="relative dropdow mb-4">
        <button
          id="dropdownDefaultButton"
          on:click={() => (isDropdownOpen = !isDropdownOpen)}
          class="text-white bg-indigo-500 rounded text-sm px-3 py-2.5 text-center inline-flex items-center"
          type="button"
        >
          Examples
          <svg
            class="w-2.5 h-2.5 ms-3"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 10 6"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m1 1 4 4 4-4"
            />
          </svg>
        </button>

        {#if isDropdownOpen}
          <div class="absolute z-10 bg-white divide-y divide-gray-100 rounded-lg shadow w-45">
            <ul class="py-2 text-sm text-gray-700">
              {#each Object.keys(exampleConfigs) as configName}
                <li class="hover:bg-gray-100">
                  <button
                    class="block px-4 py-2"
                    on:click={() => loadExampleConfig(exampleConfigs[configName])}
                  >
                    {configName}
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div> -->

      {#if !USE_FILE_MENU}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild let:builder>
            <Button
              builders={[builder]}
              class="mb-4 bg-indigo-500 hover:bg-indigo-500/90"
              size="sm"
            >
              Examples
              <ChevronDown class="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {#each Object.keys(exampleConfigs) as configName}
              <DropdownMenu.Item on:click={() => loadExampleConfig(exampleConfigs[configName])}>
                {configName}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}

      <ConfigForm {config} {handleSubmit} />

      <div class="mt-4 flex space-x-2">
        <!-- <button
          type="submit"
          on:click={() => {
            submitPressed = true;
            handleSubmit();
            submitPressed = false;
          }}
          class="bg-sky-500 text-white p-2 rounded">Submit</button
        > -->
        <Button
          on:click={() => {
            submitPressed = true;
            handleSubmit();
            submitPressed = false;
          }}
          class="bg-sky-500 hover:bg-sky-500/90"
        >
          {#if isLoading}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Submit
        </Button>
        <!-- <span> -->
        <input
          bind:this={fileInput}
          type="file"
          accept="application/json"
          on:change={loadConfig}
          class="hidden"
        />
        {#if !USE_FILE_MENU}
          <Button class="bg-sky-500 hover:bg-sky-500/90" on:click={onFileButtonClicked}>
            <Upload class="mr-2 h-4 w-4" />
            Load Config
          </Button>

          <!-- </span> -->

          <Button type="submit" class="bg-sky-500 hover:bg-sky-500/90" on:click={downloadConfig}>
            <Download class="mr-2 h-4 w-4" />
            Download Config
          </Button>

          {#if imageURL}
            <Button on:click={downloadZip} class="bg-sky-500 hover:bg-sky-500/90">
              <Download class="mr-2 h-4 w-4" />
              Download Results Zip
            </Button>
          {/if}
        {/if}
      </div>
    </div>

    <div class="basis-1/2 order-1 md:order-2">
      <!-- Link and citation buttons -->
      <div class="flex flex-row float-right">
        <a
          href="https://github.com/jfuruness/bgpy_pkg/wiki"
          target="_blank"
          class="p-2 rounded-full hover:bg-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
            ><path
              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
            /></svg
          >
        </a>
        <button on:click={() => (showInfo = true)} class="p-2 rounded-full hover:bg-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
            ><path
              d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"
            /></svg
          >
        </button>
      </div>

      <Graph
        {nodes}
        {edges}
        {simulationResults}
        bind:this={graphComponent}
        bind:showModal={showAddASModal}
        bind:showClearGraphModal
        bind:cpLinks
        bind:peerLinks
      />
    </div>
  </div>

  {#if imageURL}
    <details class="mt-4" on:toggle={(event) => (isImageOpen = !isImageOpen)}>
      <summary class="text-sm font-medium leading-6 mb-2">Diagram</summary>
      <p><img src={imageURL} alt="System diagram" /></p>
    </details>
  {/if}

  <CitationModal bind:showModal={showInfo} on:close={() => (showInfo = false)} />
</main>
