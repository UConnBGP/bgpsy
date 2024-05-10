import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import type { Announcement, AnnouncementValidition, Graph, ROA } from './types';

export function isAnnouncementEmpty(ann: Announcement): boolean {
  return (
    ann.prefix === '' &&
    ann.as_path.length === 0 &&
    /** @ts-expect-error: seed_asn is not a string  */
    ann.seed_asn === ''
  );
}

export function listToIndexJsonReversed(list: number[][]) {
  const result: Record<number, number> = {};
  const listLength = list.length;
  list.forEach((sublist, index) => {
    sublist.forEach((item) => {
      // Reverse index calculation and add 1
      result[item] = listLength - index;
    });
  });
  return result;
}

export function getPropagationRanks(graph: Graph) {
  // const graph = config.graph;
  const asDict = new Map();

  // Initialize ASes and their relationships
  graph.cp_links.forEach((cp_link) => {
    const providerASN = cp_link[0];
    const customerASN = cp_link[1];

    if (!asDict.has(providerASN)) {
      asDict.set(providerASN, {
        providers: new Set(),
        customers: new Set(),
        propagationRank: null
      });
    }
    if (!asDict.has(customerASN)) {
      asDict.set(customerASN, {
        providers: new Set(),
        customers: new Set(),
        propagationRank: null
      });
    }

    asDict.get(providerASN).customers.add(customerASN);
    asDict.get(customerASN).providers.add(providerASN);
  });

  graph.peer_links.forEach((peer_link) => {
    const asn1 = peer_link[0];
    const asn2 = peer_link[1];

    if (!asDict.has(asn1)) {
      asDict.set(asn1, { providers: new Set(), customers: new Set(), propagationRank: null });
    }
    if (!asDict.has(asn2)) {
      asDict.set(asn2, { providers: new Set(), customers: new Set(), propagationRank: null });
    }
  });

  // Assign propagation ranks
  let maxRank = 0;
  function assignRanks(asn: number, rank: number) {
    const asInfo = asDict.get(asn);
    if (asInfo.propagationRank === null || asInfo.propagationRank < rank) {
      asInfo.propagationRank = rank;
      asInfo.providers.forEach((providerASN: number) => {
        assignRanks(providerASN, rank + 1);
      });
      maxRank = Math.max(maxRank, rank);
    }
  }

  asDict.forEach((asInfo, asn) => {
    if (asInfo.customers.size === 0) {
      // Leaf ASes have no customers
      assignRanks(asn, 0);
    }
  });

  // Extract propagation ranks into an object
  const propagationRanks: Record<number, number> = {};
  asDict.forEach((asInfo, asn) => {
    propagationRanks[asn] = maxRank + 1 - asInfo.propagationRank;
  });

  // console.log(propagationRanks);
  return propagationRanks;
}

// TODO: This is duplicate, merge with function in ConfigForm
export async function fetchROAStates(
  announcements: Announcement[],
  roas: ROA[]
): Promise<string[]> {
  // return Promise.all(config.announcements.forEach((ann) => checkAnnValidity));
  const states = [];
  for (const ann of announcements) {
    const state = await checkAnnValidity2(ann, roas);
    states.push(state);
  }
  // console.log(states);

  return states;
}

export async function checkAnnValidity2(ann: Announcement, roas: ROA[]): Promise<string> {
  const validation: AnnouncementValidition = {
    prefix: ann.prefix,
    origin: ann.seed_asn,
    roas: roas
  };
  try {
    const response = await fetch('/api/validate-roa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(validation)
    });
    if (!response.ok) {
      return 'Unknown';
    }
    return await response.json();
  } catch (error) {
    return 'Unknown';
  }
}

// Function to filter JSON object by value
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function countByValue(jsonObject: object, filterValue: any) {
  // Convert the JSON object to an array of [key, value] pairs
  const entries = Object.entries(jsonObject);

  // Filter the entries based on the value
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const filteredEntries = entries.filter(([_, value]) => value === filterValue);

  // Convert the filtered entries back into an object
  const filteredObject = Object.fromEntries(filteredEntries);

  return Object.keys(filteredObject).length;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// SHADCN HELPER FUNCS

type FlyAndScaleParams = {
  y?: number;
  x?: number;
  start?: number;
  duration?: number;
};

export function flyAndScale(
  node: Element,
  params: FlyAndScaleParams = { y: -8, x: 0, start: 0.95, duration: 150 }
): TransitionConfig {
  const style = getComputedStyle(node);
  const transform = style.transform === 'none' ? '' : style.transform;

  const scaleConversion = (valueA: number, scaleA: [number, number], scaleB: [number, number]) => {
    const [minA, maxA] = scaleA;
    const [minB, maxB] = scaleB;

    const percentage = (valueA - minA) / (maxA - minA);
    const valueB = percentage * (maxB - minB) + minB;

    return valueB;
  };

  const styleToString = (style: Record<string, number | string | undefined>): string => {
    return Object.keys(style).reduce((str, key) => {
      if (style[key] === undefined) return str;
      return str + `${key}:${style[key]};`;
    }, '');
  };

  return {
    duration: params.duration ?? 200,
    delay: 0,
    css: (t) => {
      const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
      const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
      const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

      return styleToString({
        transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
        opacity: t
      });
    },
    easing: cubicOut
  };
}
