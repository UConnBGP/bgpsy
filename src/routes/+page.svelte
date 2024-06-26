<script lang="ts">
  import { DataSet, type Color, type Edge, type Node } from 'vis-network/standalone';
  import ConfigForm from '$lib/components/config-form.svelte';
  import { type Config, exampleConfigsMap, type SimResults } from '$lib';
  import {
    attackerColor,
    attackerSuccessColor,
    disconnectedColor,
    victimColor,
    victimSuccessColor
  } from '$lib/types';
  import { exampleConfigs, getPropagationRanks } from '$lib';
  import CitationModal from '$lib/components/citation-modal.svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import * as Accordion from '$lib/components/ui/accordion';
  import { cn, createConfig, getROAStates } from '$lib/utils';
  import Bug from 'lucide-svelte/icons/bug';
  import { toast } from 'svelte-sonner';
  import Graph from '$lib/components/graph.svelte';
  import { Sidebar } from 'lucide-svelte';
  import { createCPEdge, createPeerEdge } from '$lib/utils/link';

  // Data
  let nodes = new DataSet<Node>([]);
  let edges = new DataSet<Edge>([]);
  let config = createConfig();

  // State
  let showSidebar = true;
  let showCitation = false;
  let showBanner = false;
  let imageURL = '';
  let prevConfig: Config | null = null;
  let simResults: SimResults | null = null;
  let errorMessage = '';
  let isLoading: boolean = false;
  let annROAStates = Array<string>();
  let graphLoadingState = ''; // TODO: Replace with something else
  let fileInput: HTMLInputElement; // Reference to the hidden file input

  // TODO: Add types
  // Drag functionality
  let firstColumn: HTMLDivElement;
  let mainColumn: HTMLElement;
  let startX: any;
  let startWidth: any;
  let containerWidth: any;
  let dragging = false;

  // Load subprefix hijack with custom anns by default
  onMount(async () => {
    if (!exampleConfigsMap[$page.url.hash]) {
      loadExampleConfig(exampleConfigs['Subprefix Hijack with Custom Announcements']);
    }
  });

  // Load config from URL using `?link=` query parameter
  $: if ($page.url.searchParams.has('link')) {
    const link = $page.url.searchParams.get('link');
    if (link) {
      fetchConfig(link);
    }
  }

  // Load corresponding example from jump link
  $: if (exampleConfigsMap[$page.url.hash]) {
    loadExampleConfig(exampleConfigs[exampleConfigsMap[$page.url.hash]]);
  }

  // TODO: Change this logic
  // Display error toast if errorMessage is changed
  $: if (showBanner && errorMessage !== '') {
    toast.error(errorMessage);
  }

  async function loadConfig(event: Event) {
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
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      // Another type check
      if (e.target === null || typeof e.target.result !== 'string') {
        return;
      }

      config = JSON.parse(e.target.result);

      // Fill in any undefined fields
      config = {
        ...createConfig(),
        ...config
      };
      // console.log(config);

      generateGraph(config);

      // Send message to graph
      graphLoadingState = 'file';

      // Update ROA validity
      // console.log(config.announcements, config.roas);
      // annROAStates = await fetchROAStates(config.announcements, config.roas);
      annROAStates = await getROAStates(config);
      // console.log('fetching roa validity');
    };
    reader.readAsText(file);

    // Reset fileInput so that we can load same file if needed
    fileInput.value = '';
    // Reset simulation results
    simResults = null;
  }

  async function loadExampleConfig(example: Config) {
    // Clone example so that same example can be reloaded
    config = structuredClone(example);

    // Load graph from config
    generateGraph(config);

    // Reset sim results
    simResults = null;
    graphLoadingState = 'example';

    // Make sure sidebar is open
    // showSidebar = true;

    // Update ROA validity
    // annROAStates = await fetchROAStates(config.announcements, config.roas);
    annROAStates = await getROAStates(config);
  }

  // Load config from query parameter
  async function fetchConfig(url: string) {
    try {
      const response = await fetch(url);
      // console.log(url);
      if (!response.ok) {
        showBanner = true;
        errorMessage = 'Network response was not ok';
        // console.log(response.status);
        return;
      }
      config = await response.json();

      // Fill in any undefined fields
      config = {
        ...createConfig(),
        ...config
      };
      // console.log(config);

      generateGraph(config);
    } catch (err) {
      showBanner = true;
      errorMessage = 'Failed to fetch JSON from link';
    }

    // Reset simulation results
    simResults = null;
  }

  function generateGraph(data: Config) {
    // Reset nodes and edges
    nodes.clear();
    edges.clear();

    if (data.graph === undefined) {
      return;
    }

    // Get all nodes
    const allAsns = new Set([
      ...data.attacker_asns,
      ...data.victim_asns,
      ...data.graph.peer_links.flat(),
      ...data.graph.cp_links.flat()
    ]);
    const levels: Record<number, number> = getPropagationRanks(data.graph);

    allAsns.forEach((asn) => {
      let node: Node = {
        id: asn,
        label: String(asn),
        level: levels[asn] || 1 // Default level to 1 if not calculated
      };

      if (data.victim_asns?.includes(asn)) {
        node.color = victimColor;
      } else if (data.attacker_asns?.includes(asn)) {
        node.color = attackerColor;
      }

      nodes.add(node);
    });

    // Convert peer and cp links to vis-network edges
    data.graph.cp_links.forEach((link) => {
      edges.add(createCPEdge(link[0], link[1]));
    });
    data.graph.peer_links.forEach((link) => {
      edges.add(createPeerEdge(link[0], link[1]));
    });
  }

  function fillInRanks(data: Config): Config {
    // Generate rest of ranks before submitting, if any custom levels are specified
    let node_level_map: Record<number, number> | undefined = undefined;
    if (data.graph.node_level_map && Object.keys(data.graph.node_level_map).length > 0) {
      node_level_map = getPropagationRanks(data.graph);
    }

    return {
      ...data,
      graph: {
        ...data.graph,
        node_level_map: node_level_map
      }
    };
  }

  async function handleSimulate() {
    showBanner = false; // Reset error state on each submission
    isLoading = true;

    try {
      const simResponse = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fillInRanks(config))
      });
      const imgResponse = await fetch('/api/simulate?include_diagram=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fillInRanks(config))
      });

      if (!imgResponse.ok) {
        showBanner = true;
        // Get error message
        const error = await imgResponse.json();
        if (imgResponse.status === 429) {
          errorMessage = error.error;
        } else if (error) {
          const msg = error.detail[0].msg;
          if (msg === '') {
            errorMessage = 'Internal server error';
          } else if (msg.includes('Value error, ')) {
            errorMessage = msg.replace('Value error, ', '');
          } else {
            errorMessage = msg;
          }
          console.log(error);
        } else {
          errorMessage = 'Failed to run simulation';
        }

        isLoading = false;
        imageURL = '';
        return;
      }

      const blob = await imgResponse.blob();
      simResults = await simResponse.json();
      if (!simResults) {
        showBanner = true;
        errorMessage = 'Failed to run simulation';
        isLoading = false;
        imageURL = '';
        return;
      }

      const outcome = simResults.outcome;
      prevConfig = config; // Save for downloading zip
      imageURL = URL.createObjectURL(blob);

      nodes.forEach((node: Node) => {
        let color = node.color as Color;
        let asn = Number(node.id);
        if (config.attacker_asns?.includes(asn)) {
          color = attackerColor;
        } else if (config.victim_asns?.includes(asn)) {
          color = victimColor;
        }

        if (outcome[asn] === 0 && !config.attacker_asns?.includes(asn)) {
          // Attacker success
          color = attackerSuccessColor;
        } else if (outcome[asn] === 1 && !config.victim_asns?.includes(asn)) {
          // Victim success
          color = victimSuccessColor;
        } else if (outcome[asn] === 2) {
          // Disconnected
          color = disconnectedColor;
        }

        nodes.update({ ...node, color: color });
      });
    } catch (error) {
      showBanner = true;
      errorMessage = 'Internal server error';
      imageURL = '';
      // console.error('Error running submission:', error);
    }

    isLoading = false;
  }

  async function downloadZip() {
    try {
      if (prevConfig === null) {
        console.log('error: prevConfig is null');
        return;
      }

      const response = await fetch('/api/simulate?download_zip=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fillInRanks(prevConfig)) // Use previous since that's we submitted
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
    // addGraphToConfig();

    const configJson = JSON.stringify(config, null, 2);
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

  // TODO: Add types
  function startDrag(e: any) {
    startX = e.clientX;
    startWidth = firstColumn.offsetWidth;
    containerWidth = mainColumn.offsetWidth;
    dragging = true;
    document.addEventListener('mousemove', doDrag, false);
    document.addEventListener('mouseup', stopDrag, false);
  }

  // TODO: Add types
  function doDrag(e: any) {
    const newWidth = startWidth + e.clientX - startX;

    // Stop after 25% and 50% width
    // if (newWidth < containerWidth / 4) {
    //   return;
    // } else if (newWidth > containerWidth / 2) {
    //   return;
    // }

    // firstColumn.style.width = newWidth + 'px';
    firstColumn.style.setProperty('--sidebar-width', newWidth + 'px');
  }

  // TODO: Add types
  function stopDrag(e: any) {
    document.removeEventListener('mousemove', doDrag, false);
    document.removeEventListener('mouseup', stopDrag, false);
    dragging = false;
  }
</script>

<svelte:head>
  <title>BGPy</title>
</svelte:head>

<main bind:this={mainColumn} class={`w-full mx-auto pb-4 ${dragging ? 'select-none' : ''}`}>
  <div class="">
    <div class="flex flex-wrap justify-between items-center px-6 py-3">
      <div class="flex justify-start w-full sm:w-auto order-3 sm:order-1">
        <!-- Show/hide sidebar -->
        <Button
          variant="outline"
          size="sm"
          class="hidden md:inline mr-2"
          on:click={() => {
            showSidebar = !showSidebar;
            graphLoadingState = `toggle-sidebar-${showSidebar ? 'on' : 'off'}`;
          }}>
          <Sidebar class="size-4" />
        </Button>

        <!-- Examples dropdown -->
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="outline" size="sm">
              Examples
              <ChevronDown class="ml-2 size-4" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {#each Object.keys(exampleConfigsMap) as configName}
              <DropdownMenu.Item href={configName}>
                {exampleConfigsMap[configName]}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      <div class="flex justify-center sm:order-2">
        <h1 class="sm:text-3xl font-semibold">BGPy Editor</h1>
      </div>

      <!-- Link and citation buttons -->
      <div class="flex justify-end sm:order-3">
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
          href="https://github.com/jfuruness/bgpy_pkg/issues"
          target="_blank"
          class="p-2 rounded-full hover:bg-gray-200">
          <Bug class="size-6" />
        </a>
        <button on:click={() => (showCitation = true)} class="p-2 rounded-full hover:bg-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path
              d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </button>
      </div>
    </div>

    <hr />
  </div>

  <!-- Two columns for form and graph -->
  <div class={`flex flex-col md:flex-row`}>
    <div
      bind:this={firstColumn}
      id="sidebar"
      class={`order-2 md:order-1 px-6 py-3 bg-slate-50 md:min-w-[25vw] md:max-w-[50vw] flex-grow overflow-x-scroll ${
        showSidebar ? '' : 'md:hidden'
      }`}>
      <ConfigForm
        bind:config
        {nodes}
        bind:annROAStates
        showLoadingSpinner={isLoading}
        showDownloadZip={imageURL !== ''}
        onSimulate={handleSimulate}
        onLoadConfig={loadConfig}
        onDownloadConfig={downloadConfig}
        onDownloadZip={downloadZip} />
    </div>

    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="order-2 w-[3px] cursor-col-resize md:block hidden bg-slate-200"
      on:mousedown={startDrag}>
    </div>

    <div class="order-1 md:order-3 px-6 py-3 flex-grow overflow-x-scroll">
      <Graph {nodes} {edges} bind:config bind:simResults bind:imageURL bind:graphLoadingState />
    </div>
  </div>

  <hr />

  <!-- Diagram accordion -->
  {#if imageURL}
    <Accordion.Root class=" px-6">
      <Accordion.Item value="item-1">
        <Accordion.Trigger>Diagram</Accordion.Trigger>
        <Accordion.Content>
          <p><img src={imageURL} alt="System diagram" /></p>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  {/if}

  <CitationModal bind:showModal={showCitation} on:close={() => (showCitation = false)} />
</main>

<style>
  #sidebar {
    flex-basis: var(--sidebar-width, 33%);
  }

  @media (max-width: 768px) {
    #sidebar {
      flex-basis: 100%;
    }
  }
</style>
