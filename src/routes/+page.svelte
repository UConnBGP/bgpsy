<script lang="ts">
  import { DataSet } from 'vis-network/standalone/esm/vis-network';
  import ConfigForm from '../components/ConfigForm.svelte';
  // import DiagramFetcher from '../components/DiagramFetcher.svelte';
  import Graph from '../components/Graph.svelte';
  import type { Config } from '$lib';
  import { getPropagationRanks } from '$lib';

  // State
  let nodes = new DataSet([
    // { id: 1, label: '1', level: 1, color: { border: '#ea580c', background: '#f59e0b' } },
    // { id: 2, label: '2', level: 2, color: { border: '#ea580c', background: '#f59e0b' } },
    // { id: 3, label: '3', level: 2, color: { border: '#ea580c', background: '#f59e0b' } },
    // // { id: 1, label: '1', level: 1, color: { border: '#16a34a', background: '#86efac' } },
    // // { id: 2, label: '2', level: 2, color: { border: '#16a34a', background: '#86efac' } },
    // // { id: 3, label: '3', level: 2, color: { border: '#16a34a', background: '#86efac' } },
    // {
    //   id: 666,
    //   label: '666',
    //   level: 3,
    //   role: 'attacker',
    //   color: { border: '#b91c1c', background: '#f87171' }
    // },
    // {
    //   id: 777,
    //   label: '777',
    //   level: 3,
    //   role: 'victim',
    //   color: { border: '#047857', background: '#34d399' }
    // }
  ]);
  let edges = new DataSet([
    // { id: crypto.randomUUID(), from: 1, to: 2 },
    // { id: crypto.randomUUID(), from: 2, to: 777 },
    // { id: crypto.randomUUID(), from: 3, to: 666 },
    // { id: crypto.randomUUID(), from: 3, to: 2, dashes: true, width: 2, arrows: 'to, from' }
  ]);
  let config: Config = {
    name: '',
    desc: '',
    scenario: null,
    announcements: [],
    propagation_rounds: 1
  };

  let imageURL = '';
  let prevConfig: Config | null = null;
  let fileInput; // Reference to the hidden file input
  let submitPressed;
  let isImageOpen = false;
  let simulationResults: {} | null = null;
  let cpLinks: number[][] = [];
  let peerLinks: number[][] = [];

  function loadConfig(event) {
    const file = event.target.files[0];
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

  // function calculateLevels(
  //   config: Config,
  //   cpLinks: number[],
  //   peerLinks: number[]
  // ): Record<number, number> {
  //   // For demo
  //   if (config.name === 'Config 1') {
  //     return {
  //       1: 1,
  //       2: 2,
  //       3: 2,
  //       666: 3,
  //       777: 3
  //     };
  //   } else if (config.name === 'Config 3') {
  //     return {
  //       1: 1,
  //       2: 2,
  //       3: 2,
  //       4: 3,
  //       6: 3,
  //       777: 3,
  //       5: 3
  //     };
  //   } else if (config.name === 'Config 36') {
  //     return {
  //       666: 4,
  //       777: 4,
  //       1: 3,
  //       2: 3,
  //       3: 3,
  //       4: 3,
  //       5: 2,
  //       8: 2,
  //       9: 2,
  //       10: 1,
  //       11: 1
  //     };
  //   } else {
  //     return {};
  //   }
  // }

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

    const levels = getPropagationRanks(data, data.graph.cp_links, data.graph.peer_links);
    // const levels = calculateLevels(data, data.graph.cp_links, data.graph.peer_links);
    // console.log(levels);
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
        if (node.policy === 'rov') {
          node.shape = 'square';
        }
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
        witdh: 2,
        arrows: 'to, from'
      });
    });
    data.graph.cp_links.forEach((link) => {
      edges.add({ from: link[0], to: link[1] });
    });

    // nodes.forEach((e, id) => {
    //   console.log(e);
    // });

    // Update the network with new data
    // network.setData({ nodes, edges });
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

      if (node.policy === 'bgp' || node.policy == 'rov') {
        asnPolicyMap[node.id] = node.policy;
      }
    });

    // Process edges to classify into CP and peer links
    // edges.forEach((edge) => {
    //   // const fromLevel = nodes.get(edge.from).level;
    //   // const toLevel = nodes.get(edge.to).level;

    //   // if (fromLevel === toLevel) {
    //   //   peerLinks.push([edge.from, edge.to]);
    //   // } else {
    //   //   cpLinks.push([edge.from, edge.to]);
    //   // }
    //   // console.log(edge);

    //   // Check edges instead of level for now, until we can get import levels fixed
    //   if (edge.dashes) {
    //     peerLinks.push([edge.from, edge.to]);
    //   } else {
    //     cpLinks.push([edge.from, edge.to]);
    //   }
    // });

    config = {
      ...config,
      attacker_asns: attackerASNs,
      victim_asns: victimASNs,
      asn_policy_map: asnPolicyMap,
      graph: {
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
      // if (!response.ok) {
      //   console.log(response.json());
      // }
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
      console.error('Error fetching image:', error);
    }
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

<main class="container mx-auto px-4 py-4 space-y-6">
  <h1 class="text-4xl font-semibold">BGPy</h1>
  <!-- <p>Enter a JSON of the configuration you would like to test.</p> -->
  <div class="flex md:flex-row flex-col space-x-4">
    <div class="basis-1/2 order-2 md:order-1">
      <button type="submit" class="bg-indigo-500 text-white p-2 rounded mb-4"
        >Subprefix Hijack</button
      >
      <button type="submit" class="bg-indigo-500 text-white p-2 rounded mb-4"
        >BGP Propagation</button
      >
      <ConfigForm {config} {handleSubmit} />
      <div class="mt-4">
        <button
          type="submit"
          on:click={() => {
            submitPressed = true;
            handleSubmit();
            submitPressed = false;
          }}
          class="bg-sky-500 text-white p-2 rounded">Submit</button
        >
        <span>
          <button
            type="button"
            class="bg-sky-500 text-white p-2 rounded"
            on:click={onFileButtonClicked}
          >
            Load Config
          </button>
          <input
            bind:this={fileInput}
            type="file"
            accept="application/json"
            on:change={loadConfig}
            class="hidden"
          />
        </span>

        <button type="submit" class="bg-sky-500 text-white p-2 rounded" on:click={downloadConfig}
          >Download Config</button
        >
        {#if imageURL}
          <button on:click={downloadZip} class=" bg-sky-500 text-white p-2 rounded"
            >Download Results Zip</button
          >
        {/if}
      </div>
    </div>
    <div class="basis-1/2 order-1 md:order-2">
      <Graph {nodes} {edges} {simulationResults} bind:cpLinks bind:peerLinks />
    </div>
  </div>

  {#if imageURL}
    <details on:toggle={(event) => (isImageOpen = !isImageOpen)}>
      <summary class="text-sm font-medium leading-6 mb-2">Diagram</summary>
      <p><img src={imageURL} alt="System diagram" /></p>
    </details>
  {/if}
</main>
