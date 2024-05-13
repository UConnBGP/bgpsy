<script>
  import '../app.css';
  import { Toaster } from '$lib/components/ui/sonner';
</script>

<!-- Double duration for longer error messages -->
<Toaster duration={8000} />

<slot />
