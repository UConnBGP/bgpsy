<script>
  let imageURL = '';
  let jsonContent = '';
  let jsonInput = '';
  let isValidJson = true;

  const exampleJson1 = `{ 
    "name": "Example Config 1",
    "desc": "Basic BGP Propagation (with normal BGP AS)",
    "scenario": "ValidPrefix",
    "victim_asns": [777],
    "propagation_rounds": 1,
    "graph": {
        "peer_links": [
            [2, 3],
            [777, 5]
        ],
        "cp_links": [
            [1, 2],
            [2, 4],
            [2, 777],
            [3, 6]
        ]
    }
}`;

  const exampleJson2 = `{
    "name": "Example Config 2",
    "desc": "BGP hidden hijack (with simple AS)",
    "scenario": "SubprefixHijack",
    "attacker_asns": [666],
    "victim_asns": [777],
    "adopting_asns": {},
    "propagation_rounds": 1,
    "graph": {
        "peer_links": [
            [2, 3]
        ],
        "cp_links": [
            [1, 2],
            [2, 777],
            [3, 666]
        ]
    }
}`;

  const exampleJson3 = `{
    "name": "Example Config 3",
    "desc": "NonRouted Superprefix Hijack",
    "scenario": "NonRoutedSuperprefixHijack",
    "attacker_asns": [666],
    "victim_asns": [777],
    "adopting_asns": {"2": "ROV"},
    "propagation_rounds": 1,
    "graph": {
        "peer_links": [
        ],
        "cp_links": [
            [1, 2],
            [1, 666],
            [2, 3]
        ]
    }
}`;

  function validateJson() {
    try {
      JSON.parse(jsonInput);
      isValidJson = true;
      jsonContent = JSON.parse(jsonInput);
    } catch (error) {
      isValidJson = false;
      console.error('Invalid JSON:', error);
    }
  }

  function insertExampleJson(exampleJson) {
    jsonInput = exampleJson;
    validateJson();
  }

  async function fetchImage() {
    if (!isValidJson || jsonContent === '') {
      alert('Please enter valid JSON.');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/simulate', {
        method: 'POST',
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
</script>

<button on:click={() => insertExampleJson(exampleJson1)}>BGP Propagation</button>
<button on:click={() => insertExampleJson(exampleJson2)}>Subprefix Hijack</button>
<button on:click={() => insertExampleJson(exampleJson3)}>NonRouted Superprefix Hijack</button>

<p><textarea bind:value={jsonInput} on:input={validateJson} rows="30" cols="60" /></p>
{#if !isValidJson}
  <p style="color: red;">Invalid JSON. Please correct it.</p>
{/if}

<button on:click={fetchImage}>Submit</button>

{#if imageURL}
  <p><img src={imageURL} alt="System diagram" /></p>
{/if}
