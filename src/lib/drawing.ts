import type { SimulationResults } from './types';

export function getLocalRIBData(
  simulationResults: SimulationResults | null,
  asn: number
): string[][] {
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

export function getASPolicyName(policyMap: Record<number, string>, asn: number) {
  let policy = 'BGP';
  if (asn in policyMap) {
    policy = policyMap[asn].toLowerCase();

    if (policy === 'rov' || policy === 'aspa' || policy === 'otc') {
      policy = policy.toUpperCase();
    } else if (policy === 'pathend') {
      policy = 'Pathend';
    } else if (policy === 'bgpsec') {
      policy = 'BGPSec';
    }
  }
  return policy;
}

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

export function drawShape(
  ctx: CanvasRenderingContext2D,
  policy: string,
  x: number,
  y: number,
  r: number
) {
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

export function drawNode(
  { ctx, id, x, y, state: { selected, hover }, style, label },
  simulationResults: SimulationResults | null,
  policyMap: Record<number, string>
) {
  ctx.save();

  // Get local RIB data
  const rows = getLocalRIBData(simulationResults, id);

  // Font for the Local RIB
  const fontSize = 14;
  ctx.font = `${fontSize}px Inter`;

  // Height of each cell
  const cellHeight = fontSize + 10;
  // Find the max width for each column in local RIB table
  const maxWidths = getMaxWidths(ctx, rows);
  // Calculate width of table
  const tableWidth = maxWidths.reduce((sum, a) => sum + a, 0);
  // Calculate height of table
  const tableHeight = cellHeight * (rows.length + 1);

  // Get formatted AS policy name
  const nodePolicy = getASPolicyName(policyMap, id);

  // Adjust radius based on policy name length if simulation results are empty
  const r = getNodeRadius(ctx, tableWidth, nodePolicy, rows);

  // if (r > maxNodeRadius) {
  //   maxNodeRadius = r;
  //   // console.log('maxRadius:', maxNodeRadius);
  //   // network.setOptions({
  //   //   ...options,
  //   //   layout: {
  //   //     hierarchical: {
  //   //       enabled: true,
  //   //       levelSeparation: maxNodeRadius * 2.5,
  //   //       nodeSpacing: maxNodeRadius * 2.5,
  //   //       sortMethod: 'directed'
  //   //     }
  //   //   }
  //   // });
  //   // network.fit({ animation: { duration: 200, easingFunction: 'linear' } });
  // }

  // Style for shape
  ctx.fillStyle = style.color;
  ctx.strokeStyle = style.borderColor;
  ctx.lineWidth = selected || hover ? 3 : 2;

  // Draw it
  drawShape(ctx, nodePolicy, x, y, r);

  // Put the ASN and policy in the middle of the node
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Calculate the total height for centering
  const totalHeight = (rows.length > 0 ? tableHeight : 0) + 2 * fontSize + 20;

  // Draw it
  drawText(ctx, label, nodePolicy, totalHeight, fontSize, x, y);

  // Draw Local RIB
  drawLocalRIB(ctx, rows, tableWidth, tableHeight, maxWidths, cellHeight, x, y);

  ctx.restore();

  return {
    drawNode: null,
    nodeDimensions: { width: r * 2, height: r * 2 }
  };
}
