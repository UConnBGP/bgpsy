<script>
	let imageURL = '';
	let jsonContent = '';

	async function fetchImage() {
		// if (jsonContent == '') {
		// 	return;
		// }

		try {
			// Send POST request to server with submitted JSON file
			const response = await fetch('http://localhost:8000/foo', {
				method: 'POST',
				// cache: 'no-store',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(jsonContent)
			});
			let blob = await response.blob();
			imageURL = URL.createObjectURL(blob);
		} catch (error) {
			console.error('Error fetching image:', error);
		}
	}

	function handleFileChange(event) {
		const file = event.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				jsonContent = JSON.parse(e.target.result);
				console.log(jsonContent);
			};
			reader.readAsText(file);
		}
	}
</script>

<p><input type="file" accept=".json" on:change={handleFileChange} /></p>
<button on:click={fetchImage}>Submit</button>
<p>
	{#if imageURL}
		<img src={imageURL} alt="System diagram" />
	{/if}
</p>
