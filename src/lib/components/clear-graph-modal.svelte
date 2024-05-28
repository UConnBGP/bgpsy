<script lang="ts">
  import * as AlertDialog from '$lib/components/ui/alert-dialog';

  export let showModal: boolean;
  export let onClear: () => void;
</script>

<!-- Clear Graph Confirmation Modal -->
<AlertDialog.Root bind:open={showModal}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you sure?</AlertDialog.Title>
      <AlertDialog.Description>
        Clearing the graph will remove all ASes and links. This cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action on:click={onClear} class="bg-destructive hover:bg-destructive/90">
        Continue
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
