<script>
  let sidebarWidth = 200; // Initial width of the sidebar in pixels

  function startResize(event) {
    window.addEventListener('mousemove', doResize, false);
    window.addEventListener('mouseup', stopResize, false);
  }

  function doResize(event) {
    if (event.clientX < 200) {
      return;
    }
    sidebarWidth = event.clientX;
  }

  function stopResize(event) {
    window.removeEventListener('mousemove', doResize, false);
    window.removeEventListener('mouseup', stopResize, false);
  }
</script>

<div class="flex">
  <div class="bg-gray-200 fixed h-full transition-width" style="width: {sidebarWidth}px;">
    <span
      class="absolute inset-y-0 right-0 w-1 bg-gray-500 cursor-ew-resize"
      on:mousedown={startResize}>
    </span>
    <!-- Sidebar content -->
  </div>
  <div class="ml-[calc(200px+0.5rem)] flex-1 p-4">
    <!-- Main content -->
    Adjust the width of the sidebar by dragging the gray bar.
  </div>
</div>
