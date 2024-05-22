import type { DataSet, Node } from 'vis-network/standalone';
import type { Config, SimResults } from '../types';

export function getLocalRIBData(simulationResults: SimResults | null, asn: number): string[][] {
  if (simulationResults && simulationResults.local_ribs[asn]) {
    return simulationResults.local_ribs[asn].map(({ type, mask, as_path }) => {
      return [mask, as_path.join(', '), type === 'attacker' ? '\u{1F608}' : '\u{1F607}'];
    });
  }

  return [];
}

// Find the max width for each column
export function getMaxWidths(
  ctx: CanvasRenderingContext2D,
  rows: string[][]
): [number, number, number] {
  let maxWidths: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < rows.length; i++) {
    let width = ctx.measureText(rows[i][0]).width + 5;
    maxWidths[0] = Math.max(maxWidths[0], width);

    width = ctx.measureText(rows[i][1]).width + 5;
    maxWidths[1] = Math.max(maxWidths[1], width);

    width = ctx.measureText(rows[i][2]).width + 5;
    maxWidths[2] = Math.max(maxWidths[2], width);
  }
  return maxWidths;
}

// export function getFormattedASPolicyNameFromConfig(asn: number, config: Config) {
//   let policy = 'BGP';
//   if (asn in config.asn_policy_map) {
//     policy = config.asn_policy_map[asn].toLowerCase();

//     if (policy === 'rov' || policy === 'aspa' || policy === 'otc') {
//       policy = policy.toUpperCase();
//     } else if (policy === 'pathend') {
//       policy = 'Pathend';
//     } else if (policy === 'bgpsec') {
//       policy = 'BGPSec';
//     }
//   }
//   return policy;
// }

export function getFormattedASPolicyName(policyMap: Record<number, string>, asn: number) {
  let policy = 'BGP';
  if (asn in policyMap) {
    policy = policyMap[asn].toLowerCase();

    if (policy === 'rov' || policy === 'aspa' || policy === 'otc' || policy === 'aspa+rov') {
      policy = policy.toUpperCase();
    } else if (policy === 'path-end') {
      policy = 'Path-End';
    } else if (policy === 'bgpsec') {
      policy = 'BGPSec';
    }
  }
  return policy;
}

// Adjust radius based on policy name length if simulation results are empty
export function getNodeRadius(
  ctx: CanvasRenderingContext2D,
  tableWidth: number,
  policy: string,
  rows: string[][]
): number {
  if (rows.length > 0) {
    return Math.max(60, tableWidth / 1.5);
  } else {
    const policyTextWidth = ctx.measureText(policy).width;
    return Math.max(35, policyTextWidth / 1.25);
  }
}

export function getMaxNodeRadius(
  ctx: CanvasRenderingContext2D,
  simResults: SimResults | null,
  policyMap: Record<number, string>,
  nodes: DataSet<Node>
): number {
  const radii = Array<number>();
  for (const node of nodes.get()) {
    const asn = Number(node.id);
    const rows = getLocalRIBData(simResults, asn);
    const maxWidths = getMaxWidths(ctx, rows);
    const tableWidth = maxWidths.reduce((sum, a) => sum + a, 0);
    const nodePolicy = getFormattedASPolicyName(policyMap, asn);
    radii.push(getNodeRadius(ctx, tableWidth, nodePolicy, rows));
  }
  return Math.max(...radii);
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  policy: string,
  x: number,
  y: number,
  r: number
) {
  const origX = x;
  const origY = y;
  // Clear previous path
  ctx.beginPath();

  if (policy === 'BGP') {
    // Draw a circle
    ctx.arc(x, y, r, 0, 2 * Math.PI, false);
  } else {
    // Draw an octagon
    const angleOffset = Math.PI / 8; // 22.5 degrees for octagon

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i - angleOffset;
      const x_i = x + r * Math.cos(angle);
      const y_i = y + r * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x_i, y_i);
      } else {
        ctx.lineTo(x_i, y_i);
      }
    }
    ctx.closePath();
  }

  ctx.fill();
  ctx.stroke();
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  label: string,
  nodePolicy: string,
  totalHeight: number,
  fontSize: number,
  x: number,
  y: number
) {
  const centerY = y - totalHeight / 2;
  ctx.fillText(label, x, centerY + fontSize);
  ctx.fillText(nodePolicy, x, centerY + 2.5 * fontSize);
}

export function drawLocalRIB(
  ctx: CanvasRenderingContext2D,
  rows: string[][],
  tableWidth: number,
  tableHeight: number,
  maxWidths: [number, number, number],
  cellHeight: number,
  x: number,
  y: number
) {
  // Draw the table
  const startX = x - tableWidth / 2;
  const startY = y - tableHeight / 2;
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;
  ctx.fillStyle = 'black';

  // Draw rows
  for (let i = 0; i < rows.length; i++) {
    let prevWidth = startX;

    for (let j = 0; j < rows[i].length; j++) {
      const cell = rows[i][j];
      const width = maxWidths[j];
      const cellX = prevWidth;
      const cellY = startY + (i + 1) * cellHeight;
      ctx.strokeRect(cellX, cellY, width, cellHeight);

      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell, cellX + width / 2, cellY + cellHeight / 2);

      prevWidth += width;
    }
  }
}
