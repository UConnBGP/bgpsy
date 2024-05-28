<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import { Label } from '$lib/components/ui/label';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { Plus, Trash2 } from 'lucide-svelte';
  import { createNode, getAllASes, getCurrentVictim, updatePropRanks } from '$lib/utils/as';
  import type { DataSet, Edge, Node } from 'vis-network/standalone';
  import { toast } from 'svelte-sonner';
  import { attackerColor, policies, roles, victimColor, type Config } from '$lib/types';
  import { createCPEdge, createPeerEdge } from '$lib/utils/link';

  export let showModal: boolean;
  export let nodes: DataSet<Node>;
  export let edges: DataSet<Edge>;
  export let config: Config;
  export let refreshSelectedAS: () => void;
  export let centerGraph: () => void;

  let newASN: number | null = null;
  let newASPolicy = 'bgp';
  let newASRole = 'none';
  let newASProviders = Array<number | null>();
  let newASCustomers = Array<number | null>();
  let newASPeers = Array<number | null>();

  function getAvailableASes(current: number | null = null) {
    return getAllASes(nodes).filter((asn) => {
      if (current !== null && asn === current) {
        return true;
      }

      return (
        !newASProviders.includes(asn) && !newASCustomers.includes(asn) && !newASPeers.includes(asn)
      );
    });
  }

  function addNode() {
    // Not sure how, but it can sometimes be an empty string...
    // @ts-ignore
    if (!newASN) {
      toast.error('AS Number is not entered');
      return;
    }

    // Need to make number for some reason
    newASN = Number(newASN);

    // Error if AS is negative
    if (newASN < 0) {
      toast.error('AS Number cannot be negative');
      return;
    }

    // Error if AS already exists
    if (nodes.get(Number(newASN))) {
      toast.error(`AS ${newASN} already exists`);
      return;
    }

    const newNode = createNode(Number(newASN), 1);

    if (newASPolicy.toLowerCase() !== 'bgp') {
      config.asn_policy_map[Number(newASN)] = newASPolicy;
    }

    const currentVictim = getCurrentVictim(config);

    if (newASRole === 'victim') {
      newNode.color = victimColor;

      // Remove victim role from previous victim if it exists
      if (currentVictim !== null) {
        // @ts-ignore
        nodes.update({ id: currentVictim, color: null });
        config.victim_asns = config.victim_asns.filter((victim) => victim !== currentVictim);
      }

      config.victim_asns = [...config.victim_asns, newASN];
    } else if (newASRole === 'attacker') {
      newNode.color = attackerColor;

      config.attacker_asns = [...config.attacker_asns, newASN];
    }

    // Add node
    nodes.add(newNode);

    // Create customer links
    for (const customer of newASCustomers) {
      if (customer === null) {
        continue;
      }
      edges.add(createCPEdge(Number(newASN), Number(customer)));

      config.graph.cp_links = [...config.graph.cp_links, [Number(newASN), Number(customer)]];
    }

    // Create provider links
    for (const provider of newASProviders) {
      if (provider === null) {
        continue;
      }
      edges.add(createCPEdge(Number(provider), Number(newASN)));

      config.graph.cp_links = [...config.graph.cp_links, [Number(provider), Number(newASN)]];
    }

    // Create peer edges
    for (const peer of newASPeers) {
      if (peer === null) {
        continue;
      }
      edges.add(createPeerEdge(Number(newASN), Number(peer)));

      config.graph.peer_links = [...config.graph.peer_links, [Number(newASN), Number(peer)]];
    }

    // TODO: Consider adding this
    // Since graph is changed, clear out simulation results
    // simulationResults = null;
    // imageURL = null;
    // for (const node of nodes.get()) {
    //   if (policyMap[Number(node.id)]) {
    //     node.color = null;
    //   }
    // }

    // Adjust height of graph
    updatePropRanks(nodes, config);

    // If we added an edge to the selected AS, reselect it so that it shows up on the details card
    refreshSelectedAS();

    // Center graph
    centerGraph();

    // Reset input
    newASN = null;
    newASPolicy = 'bgp';
    newASRole = 'none';
    newASCustomers = [];
    newASProviders = [];
    newASPeers = [];

    showModal = false; // Close modal

    console.log(config);
  }

  // $: newASN, console.log(newASN);
</script>

<!-- Add AS Modal -->
<Dialog.Root bind:open={showModal}>
  <Dialog.Content
    class="md:max-w-3xl sm:max-w-[90vw] max-w-[99vw] md:left-[9%] md:top-[5%] md:translate-x-[-9%] md:translate-y-[-5%]">
    <Dialog.Header>
      <Dialog.Title>Add AS</Dialog.Title>
      <Dialog.Description>
        Create a new AS. Specify an AS's policy and role (i.e., victim or attacker) as well as its
        relationships to other ASes in the graph.
      </Dialog.Description>
    </Dialog.Header>
    <div>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-5 items-center gap-4">
          <Label class="text-right">AS Number</Label>
          <Input bind:value={newASN} class="col-span-4" type="number" />
        </div>

        <div class="grid grid-cols-5 items-center gap-4">
          <Label class="text-right">Policy</Label>

          <Select.Root
            selected={{ value: newASPolicy, label: policies[newASPolicy] }}
            onSelectedChange={(selected) => {
              newASPolicy = selected === undefined ? newASPolicy : selected.value;
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

          <Select.Root
            selected={{ value: newASRole, label: roles[newASRole] }}
            onSelectedChange={(selected) => {
              console.log(selected);
              newASRole = selected === undefined ? newASRole : selected.value;
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
      </div>

      <div class="grid sm:grid-cols-3 sm:grid-rows-none grid-rows-3 grid-cols-none gap-2 mt-4">
        <!-- Providers Column -->
        <div class="border p-4 rounded-lg">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-md font-medium">Providers</h2>
            <Button
              size="icon"
              variant="outline"
              class="size-7"
              on:click={() => (newASProviders = [...newASProviders, null])}>
              <Plus class="size-4" />
            </Button>
          </div>
          <div class="space-y-2">
            {#each newASProviders as provider, index}
              <div class="grid grid-cols-4 gap-2">
                <Select.Root
                  selected={provider !== null
                    ? { value: provider, label: String(provider) }
                    : undefined}
                  onSelectedChange={(selected) => {
                    newASProviders[index] = selected === undefined ? null : selected.value;
                  }}>
                  <Select.Trigger class="col-span-3">
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
                    newASProviders.splice(index, 1);
                    newASProviders = newASProviders;
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
              on:click={() => (newASCustomers = [...newASCustomers, null])}>
              <Plus class="size-4" />
            </Button>
          </div>
          <div class="space-y-2">
            {#each newASCustomers as customer, index}
              <div class="grid grid-cols-4 gap-2">
                <Select.Root
                  selected={customer !== null
                    ? { value: customer, label: String(customer) }
                    : undefined}
                  onSelectedChange={(selected) => {
                    newASCustomers[index] = selected === undefined ? null : selected.value;
                  }}>
                  <Select.Trigger class="col-span-3">
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
                  on:click={() => {
                    newASCustomers.splice(index, 1);
                    newASCustomers = newASCustomers;
                  }}>
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
              on:click={() => (newASPeers = [...newASPeers, null])}>
              <Plus class="size-4" />
            </Button>
          </div>
          <div class="space-y-2">
            {#each newASPeers as peer, index}
              <div class="grid grid-cols-4 gap-2">
                <Select.Root
                  selected={peer !== null ? { value: peer, label: String(peer) } : undefined}
                  onSelectedChange={(selected) => {
                    newASPeers[index] = selected === undefined ? null : selected.value;
                  }}>
                  <Select.Trigger class="col-span-3">
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
                  on:click={() => {
                    newASPeers.splice(index, 1);
                    newASPeers = newASPeers;
                  }}>
                  <Trash2 class="size-4" />
                </Button>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <Dialog.Footer>
      <Button on:click={addNode} class="bg-emerald-500 hover:bg-emerald-500">Add</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
