<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Label } from '$lib/components/ui/label';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { Plus, Trash2 } from 'lucide-svelte';
  import { availableNodes, createNode, updatePropRanks } from '$lib/utils/as';
  import type { DataSet, Edge, Node } from 'vis-network/standalone';
  import { toast } from 'svelte-sonner';
  import { attackerColor, victimColor, type Config } from '$lib/types';

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

    if (newASRole === 'victim') {
      newNode.color = victimColor;

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

      const newEdge = {
        from: Number(newASN),
        to: Number(customer),
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8
          }
        }
      };

      edges.add(newEdge);
      // cpLinks = [...cpLinks, [Number(newNodeId), Number(customer)]];
      config.graph.cp_links = [...config.graph.cp_links, [Number(newASN), Number(customer)]];
    }

    // Create provider links
    for (const provider of newASProviders) {
      if (provider === null) {
        continue;
      }

      const newEdge = {
        from: Number(provider),
        to: Number(newASN),
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8
          }
        }
      };

      edges.add(newEdge);
      // cpLinks = [...cpLinks, [Number(provider), Number(newNodeId)]];
      config.graph.cp_links = [...config.graph.cp_links, [Number(provider), Number(newASN)]];
    }

    // Create peer edges
    for (const peer of newASPeers) {
      if (peer === null) {
        continue;
      }
      const newEdge = {
        from: Number(newASN),
        to: Number(peer),
        dashes: true,
        width: 2,
        arrows: 'to, from'
      };

      edges.add(newEdge);
      // peerLinks = [...peerLinks, [Number(newNodeId), Number(peer)]];
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
          <select
            bind:value={newASPolicy}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-4">
            <option value="bgp">BGP</option>
            <option value="rov">ROV</option>
            <option value="aspa">ASPA</option>
            <option value="bgpsec">BGPSec</option>
            <option value="otc">Only to Customers</option>
            <option value="path-end">Path-End</option>
          </select>
        </div>

        <div class="grid grid-cols-5 items-center gap-4">
          <Label class="text-right">Role</Label>
          <select
            bind:value={newASRole}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-4">
            <option value="none">None</option>
            <option value="attacker">Attacker</option>
            <option value="victim">Victim</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 mt-4">
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
                <select
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-3"
                  bind:value={newASProviders[index]}>
                  <option value={null}>Select an AS</option>
                  {#each availableNodes(nodes, newASProviders, index) as node}
                    <option value={node.id}>{node.label || node.id}</option>
                  {/each}
                </select>

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
                <select
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-3"
                  bind:value={newASCustomers[index]}>
                  <option value={null}>Select an AS</option>
                  {#each availableNodes(nodes, newASCustomers, index) as node}
                    <option value={node.id}>{node.label || node.id}</option>
                  {/each}
                </select>

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
                <select
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 col-span-3"
                  bind:value={newASPeers[index]}>
                  <option value={null}>Select an AS</option>
                  {#each availableNodes(nodes, newASPeers, index) as node}
                    <option value={node.id}>{node.label || node.id}</option>
                  {/each}
                </select>

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
