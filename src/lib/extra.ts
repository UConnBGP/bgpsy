import type { DataSet, Node } from 'vis-network/standalone';

// Get all remaining nodes except index and those in array
export function availableNodes(
  nodes: DataSet<Node>,
  array: Array<number | null>,
  index: number,
  asnToIgnore: number | null = null
) {
  const avail = nodes
    .get()
    .filter((node: Node) => {
      return (
        (!array.includes(node.id as number) || array[index] === node.id) && node.id !== asnToIgnore
      );
    })
    .sort((a: Node, b: Node) => Number(a.id) - Number(b.id));

  return avail;
}
