<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import * as Select from '$lib/components/ui/select';
  import { Label } from '$lib/components/ui/label';
  import { Button } from '$lib/components/ui/button';
  import type { Color, DataSet, Edge, Node } from 'vis-network/standalone';
  import { attackerColor, policies, roles, victimColor, type Config } from '$lib/types';
  import { ArrowUp, Plus, Trash2, X, ArrowDown } from 'lucide-svelte';
  import {
    getAllASes,
    getCurrentVictim,
    removeAS,
    removeASRole,
    updatePropRanks
  } from '$lib/utils/as';
  import {
    createCPEdge,
    createPeerEdge,
    getEdgeByFromTo,
    removeLinkFromGraph
  } from '$lib/utils/link';
  import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
  import { getPropagationRanks } from '$lib/utils';
  import Input from './ui/input/input.svelte';

  export let selectedASN: number | null;
  export let selectedASPolicy: string | null;
  export let selectedASRole: string | null;
  export let selectedASLevel: number | null;
  export let selectedASProviders: Array<number | null>;
  export let selectedASCustomers: Array<number | null>;
  export let selectedASPeers: Array<number | null>;
  export let nodes: DataSet<Node>;
  export let edges: DataSet<Edge>;
  export let config: Config;
  export let centerGraph: () => void;

  let initialASProviders: Array<number | null>;
  let availableProviders = Array<number>();

  // $: selectedASN, (initialASProviders = [...selectedASProviders]);

  function updateASPolicy() {
    if (selectedASPolicy === null || selectedASN === null) {
      return;
    }

    // All policies except BGP are in the map
    if (selectedASPolicy.toLowerCase() !== 'bgp') {
      config.asn_policy_map[selectedASN] = selectedASPolicy;
    } else {
      delete config.asn_policy_map[selectedASN];
    }

    nodes.update({ id: selectedASN });
  }

  function updateASRole() {
    if (selectedASN === null) {
      return;
    }

    let color: Color | null = null;
    const currentVictim = getCurrentVictim(config);

    // Remove AS from previous role list
    removeASRole(selectedASN, config);

    if (selectedASRole === 'victim') {
      // Set green color for attacker
      color = victimColor;

      // Remove victim role from current victim ASN
      if (currentVictim !== null && currentVictim !== selectedASN) {
        // @ts-ignore
        nodes.update({ id: currentVictim, color: null });
        config.victim_asns = config.victim_asns.filter((victim) => victim !== currentVictim);
      }

      config.victim_asns = [...config.victim_asns, selectedASN];
    } else if (selectedASRole === 'attacker') {
      // Set red color for attacker
      color = attackerColor;

      config.attacker_asns = [...config.attacker_asns, selectedASN];
    } else {
      // Default blue color for ASes without role
      color = null;
    }

    nodes.update({
      id: selectedASN,
      // role: selectedASRole,
      // @ts-expect-error: This is allowed, the type signature is not complete
      color: color
    });
  }

  // Used for checkbox
  function setCalculateNodeLevel(calculate: boolean) {
    if (selectedASN === null) {
      return;
    }

    selectedASLevel = Number(selectedASLevel);

    if (calculate && config.graph.node_level_map) {
      selectedASLevel = null;
      delete config.graph.node_level_map[selectedASN];
      nodes.update({ id: selectedASN, level: getPropagationRanks(config.graph)[selectedASN] });
    } else if (!calculate) {
      if (config.graph.node_level_map === undefined) {
        config.graph.node_level_map = {};
      }

      // Get level from ranks, otherwise default to 1
      const ranks = getPropagationRanks(config.graph);
      selectedASLevel = selectedASN in ranks ? getPropagationRanks(config.graph)[selectedASN] : 1;
      config.graph.node_level_map[selectedASN] = selectedASLevel;
    }
  }

  // Used for input field
  function updateNodeLevel() {
    if (selectedASN === null || selectedASLevel === null) {
      return;
    }

    if (config.graph.node_level_map === undefined) {
      config.graph.node_level_map = {};
    }

    selectedASLevel = Number(selectedASLevel);

    config.graph.node_level_map[selectedASN] = selectedASLevel;
    nodes.update({ id: selectedASN, level: selectedASLevel });
    // console.log(config.graph.propagation_ranks_map);
    centerGraph();
  }

  function updateProvider(index: number, newASN: number | null) {
    if (selectedASN === null) {
      return;
    }

    // 'Select an AS' is selected
    if (newASN === null) {
      return;
    }

    // Delete edge with old AS if it is not null
    const oldASN = selectedASProviders[index];
    if (oldASN !== null) {
      // Don't do anything if the new provider is the same
      if (newASN === oldASN) {
        return;
      }
      removeLinkFromGraph(oldASN, selectedASN, edges);
    }

    // Set new provider
    selectedASProviders[index] = newASN;

    // Create new edge
    edges.add(createCPEdge(newASN, selectedASN));

    // Remove old edge from cp_links array and add new one
    config.graph.cp_links = config.graph.cp_links.filter(
      (link) => !(link[0] === oldASN && link[1] === selectedASN)
    );
    config.graph.cp_links = [...config.graph.cp_links, [newASN, selectedASN]];

    // Adjust height of graph
    updatePropRanks(nodes, config);
  }

  function updateCustomer(index: number, newASN: number | null) {
    if (selectedASN === null) {
      return;
    }

    // 'Select an AS' is selected
    if (newASN === null) {
      return;
    }

    // Delete edge with old AS if it is not null
    const oldASN = selectedASCustomers[index];
    if (oldASN !== null) {
      // Don't do anything if the new customer is the same
      if (newASN === oldASN) {
        return;
      }
      removeLinkFromGraph(selectedASN, oldASN, edges);
    }

    // Set new customer
    selectedASCustomers[index] = newASN;

    // Create new edge
    edges.add(createCPEdge(selectedASN, newASN));

    // Remove old edge from cp_links array and add new one
    config.graph.cp_links = config.graph.cp_links.filter(
      (link) => !(link[0] === selectedASN && link[1] === oldASN)
    );
    console.log('after deletion:', config.graph.cp_links);
    config.graph.cp_links = [...config.graph.cp_links, [selectedASN, newASN]];

    // Adjust height of graph
    updatePropRanks(nodes, config);
  }

  function updatePeer(index: number, newASN: number | null) {
    if (selectedASN === null) {
      return;
    }

    // 'Select an AS' is selected
    if (newASN === null) {
      return;
    }

    // Delete edge with old AS if it is not null
    const oldASN = selectedASPeers[index];
    if (oldASN !== null) {
      // Don't do anything if the new peer is the same
      if (newASN === oldASN) {
        console.log('here');
        return;
      }

      // Remove edge in both directions if needed
      removeLinkFromGraph(selectedASN, oldASN, edges);
      removeLinkFromGraph(oldASN, selectedASN, edges);
    }

    // Set new peer
    selectedASPeers[index] = newASN;

    // Create new edge
    edges.add(createPeerEdge(selectedASN, newASN));

    // Remove old edge from peer links array and add new one
    config.graph.peer_links = config.graph.peer_links.filter(
      (link) =>
        !(link[0] === oldASN && link[1] === selectedASN) &&
        !(link[0] === selectedASN && link[1] === oldASN)
    );
    config.graph.peer_links = [...config.graph.peer_links, [selectedASN, newASN]];

    // Adjust height of graph
    updatePropRanks(nodes, config);
  }

  function deleteProvider(index: number, asn: number | null) {
    if (selectedASN === null) {
      return;
    }

    // Delete provider from list
    selectedASProviders.splice(index, 1);
    selectedASProviders = selectedASProviders;

    // Nothing else to do if value was null
    if (asn === null) {
      return;
    }

    // Remove edge from graph
    removeLinkFromGraph(asn, selectedASN, edges);

    // Remove link from cp links array
    config.graph.cp_links = config.graph.cp_links.filter(
      (link) => !(link[0] === asn && link[1] === selectedASN)
    );

    // Adjust height of graph
    updatePropRanks(nodes, config);
  }

  function deleteCustomer(index: number, asn: number | null) {
    if (selectedASN === null) {
      return;
    }

    // Delete provider from list
    selectedASCustomers.splice(index, 1);
    selectedASCustomers = selectedASCustomers;

    // Nothing else to do if value was null
    if (asn === null) {
      return;
    }

    // Remove edge from graph
    removeLinkFromGraph(selectedASN, asn, edges);

    // Remove link from cp links array
    config.graph.cp_links = config.graph.cp_links.filter(
      (link) => !(link[0] === selectedASN && link[1] === asn)
    );

    // Adjust height of graph
    updatePropRanks(nodes, config);
  }

  function deletePeer(index: number, asn: number | null) {
    if (selectedASN === null) {
      return;
    }

    // Delete provider from list
    selectedASPeers.splice(index, 1);
    selectedASPeers = selectedASPeers;

    // Nothing else to do if value was null
    if (asn === null) {
      return;
    }

    // Remove edge in both directions if needed
    removeLinkFromGraph(asn, selectedASN, edges);
    removeLinkFromGraph(selectedASN, asn, edges);

    // Remove link from peer links array and add new one
    config.graph.peer_links = config.graph.peer_links.filter(
      (link) =>
        !(link[0] === asn && link[1] === selectedASN) &&
        !(link[0] === selectedASN && link[1] === asn)
    );

    // Adjust height of graph
    updatePropRanks(nodes, config);
  }

  // function getProviders(current: number | null = null) {
  //   return getAllASes(nodes).filter((asn) => {
  //     if (current !== null && asn === current) {
  //       return true;
  //     }
  //     return !selectedASProviders.includes(asn) && asn !== selectedASN;
  //   });
  // }

  function getAvailableASes(current: number | null = null) {
    return getAllASes(nodes).filter((asn) => {
      if (current !== null && asn === current) {
        return true;
      }

      return (
        asn !== selectedASN &&
        !selectedASProviders.includes(asn) &&
        !selectedASCustomers.includes(asn) &&
        !selectedASPeers.includes(asn)
      );
    });
  }

  // function getAvailableASes(relatedASes: Array<number | null>, current: number | null = null) {
  //   return getAllASes(nodes).filter((asn) => {
  //     if (current !== null && asn === current) {
  //       return true;
  //     }
  //     return !relatedASes.includes(asn) && asn !== selectedASN;
  //   });
  // }

  function deleteAS() {
    if (selectedASN === null) {
      return;
    }

    removeAS(selectedASN, nodes, edges, config);
    close();
  }

  function close() {
    // Reset all input
    selectedASN = null;
    selectedASPolicy = null;
    selectedASRole = null;
    selectedASLevel = null;
    selectedASProviders = [];
    selectedASCustomers = [];
    selectedASPeers = [];
  }
</script>

{#if selectedASN !== null}
  <Card.Root class="mx-auto lg:max-w-[50vw] max-w-full relative mt-4 md:mb-0 mb-4">
    <Card.Header>
      <Card.Title>Selected AS: {selectedASN}</Card.Title>
      <button
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        on:click={close}>
        <X class="size-4" />
        <span class="sr-only">Close</span>
      </button>
    </Card.Header>

    <Card.Content>
      <div class="grid gap-4">
        <div class="grid grid-cols-5 items-center gap-4">
          <Label class="text-right">Policy</Label>

          <!-- <select
            bind:value={selectedASPolicy}
            on:change={updateASPolicy}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-4">
            <option value="bgp">BGP</option>
            <option value="rov">ROV</option>
            <option value="aspa">ASPA</option>
            <option value="bgpsec">BGPSec</option>
            <option value="otc">Only to Customers</option>
            <option value="path-end">Path-End</option>
          </select> -->

          <Select.Root
            selected={selectedASPolicy !== null
              ? { value: selectedASPolicy, label: policies[selectedASPolicy] }
              : undefined}
            onSelectedChange={(selected) => {
              selectedASPolicy = selected === undefined ? null : selected.value;
              updateASPolicy();
            }}>
            <Select.Trigger class="col-span-4">
              <Select.Value placeholder="Select a policy" />
            </Select.Trigger>
            <Select.Content>
              {#each Object.entries(policies) as [value, label]}
                <Select.Item {value}>{label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="grid grid-cols-5 items-center gap-4">
          <Label class="text-right">Role</Label>

          <!-- <select
            bind:value={selectedASRole}
            on:change={updateASRole}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-4">
            <option value="">None</option>
            <option value="attacker">Attacker</option>
            <option value="victim">Victim</option>
          </select> -->

          <Select.Root
            selected={selectedASRole !== null
              ? { value: selectedASRole, label: roles[selectedASRole] }
              : undefined}
            onSelectedChange={(selected) => {
              console.log(selected);
              selectedASRole = selected === undefined ? null : selected.value;
              updateASRole();
            }}>
            <Select.Trigger class="col-span-4">
              <Select.Value placeholder="Select a role" />
            </Select.Trigger>
            <Select.Content>
              {#each Object.entries(roles) as [value, label]}
                <Select.Item {value}>{label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="grid grid-cols-5 items-center gap-4">
          <Checkbox
            class="justify-self-end"
            checked={selectedASLevel === null}
            onCheckedChange={(checked) => setCalculateNodeLevel(Boolean(checked))} />
          <Label class="col-span-4">Automatically calculate node level</Label>
        </div>

        {#if selectedASLevel !== null}
          <div class="grid grid-cols-5 items-center gap-4">
            <Label class="text-right">Level</Label>
            <div class="flex space-x-2 col-span-4">
              <Input
                bind:value={selectedASLevel}
                class=""
                type="number"
                min={1}
                on:change={updateNodeLevel}></Input>
              <Button
                size="icon"
                variant="outline"
                on:click={() => {
                  if (selectedASLevel !== null && selectedASLevel > 1) {
                    selectedASLevel -= 1;
                    updateNodeLevel();
                  }
                }}>
                <ArrowUp class="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                on:click={() => {
                  if (selectedASLevel !== null) {
                    selectedASLevel += 1;
                    updateNodeLevel();
                  }
                }}>
                <ArrowDown class="size-4" />
              </Button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Relationships -->
      <div class="grid grid-cols-3 gap-2 mt-4">
        <!-- Providers Column -->
        <div class="border p-4 rounded-lg">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-md font-medium">Providers</h2>
            <Button
              size="icon"
              variant="outline"
              class="size-7"
              on:click={() => (selectedASProviders = [...selectedASProviders, null])}>
              <Plus class="size-4" />
            </Button>
          </div>
          <div class="space-y-2">
            {#each selectedASProviders as provider, index}
              <div class="flex flex-row space-x-2">
                <Select.Root
                  selected={provider !== null
                    ? { value: provider, label: String(provider) }
                    : undefined}
                  onSelectedChange={(selected) => {
                    const newASN = selected === undefined ? null : selected.value;
                    updateProvider(index, newASN);
                  }}>
                  <Select.Trigger>
                    <Select.Value placeholder="Select an AS" />
                  </Select.Trigger>
                  <Select.Content>
                    {#each getAvailableASes(provider) as asn}
                      <Select.Item value={asn}>{asn}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>

                <Button
                  size="icon"
                  variant="outline"
                  class="col-span-1"
                  on:click={() => {
                    deleteProvider(index, provider);
                  }}>
                  <Trash2 class="size-4" />
                </Button>
              </div>
            {/each}
          </div>
        </div>

        <!-- Customers Column -->
        <div class="border p-4 rounded-lg">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-md font-medium">Customers</h2>
            <Button
              size="icon"
              variant="outline"
              class="size-7"
              on:click={() => (selectedASCustomers = [...selectedASCustomers, null])}>
              <Plus class="size-4" />
            </Button>
          </div>
          <div class="space-y-2">
            {#each selectedASCustomers as customer, index}
              <div class="flex flex-row space-x-2">
                <Select.Root
                  selected={customer !== null
                    ? { value: customer, label: String(customer) }
                    : undefined}
                  onSelectedChange={(selected) => {
                    const newASN = selected === undefined ? null : selected.value;
                    updateCustomer(index, newASN);
                  }}>
                  <Select.Trigger>
                    <Select.Value placeholder="Select an AS" />
                  </Select.Trigger>
                  <Select.Content>
                    {#each getAvailableASes(customer) as asn}
                      <Select.Item value={asn}>{asn}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>

                <Button
                  size="icon"
                  variant="outline"
                  class="col-span-1"
                  on:click={() => deleteCustomer(index, customer)}>
                  <Trash2 class="size-4" />
                </Button>
              </div>
            {/each}
          </div>
        </div>

        <!-- Peers Column -->
        <div class="border p-4 rounded-lg">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-md font-medium">Peers</h2>
            <Button
              size="icon"
              variant="outline"
              class="size-7"
              on:click={() => (selectedASPeers = [...selectedASPeers, null])}>
              <Plus class="size-4" />
            </Button>
          </div>
          <div class="space-y-2">
            {#each selectedASPeers as peer, index}
              <div class="flex flex-row space-x-2">
                <Select.Root
                  selected={peer !== null ? { value: peer, label: String(peer) } : undefined}
                  onSelectedChange={(selected) => {
                    const newASN = selected === undefined ? null : selected.value;
                    updatePeer(index, newASN);
                  }}>
                  <Select.Trigger>
                    <Select.Value placeholder="Select an AS" />
                  </Select.Trigger>
                  <Select.Content>
                    {#each getAvailableASes(peer) as asn}
                      <Select.Item value={asn}>{asn}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>

                <Button
                  size="icon"
                  variant="outline"
                  class="col-span-1"
                  on:click={() => deletePeer(index, peer)}>
                  <Trash2 class="size-4" />
                </Button>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </Card.Content>

    <Card.Footer>
      <Button on:click={deleteAS} variant="destructive">Delete AS</Button>
    </Card.Footer>
  </Card.Root>
{/if}
