import type { PubgKillFeedEvent, PubgVnSquadStanding } from './pubg-vn-arena-contract';

export type StandingSort = 'wwcdCount' | 'placementPts' | 'killPts' | 'totalPts';
export type SortDirection = 'descending' | 'ascending';
export const totalPoints = (squad: PubgVnSquadStanding): number => squad.placementPts + squad.killPts;

export function selectStandings(standings: readonly PubgVnSquadStanding[], query: string,
  sortBy: StandingSort, direction: SortDirection = 'descending'): PubgVnSquadStanding[] {
  const search = query.trim().toLocaleLowerCase('en');
  return standings.filter((squad) => squad.squadName.toLocaleLowerCase('en').includes(search)).sort((a, b) => {
    const scoreA = sortBy === 'totalPts' ? totalPoints(a) : a[sortBy];
    const scoreB = sortBy === 'totalPts' ? totalPoints(b) : b[sortBy];
    return (direction === 'descending' ? scoreB - scoreA : scoreA - scoreB)
      || a.squadName.localeCompare(b.squadName, 'en') || a.squadId.localeCompare(b.squadId, 'en');
  });
}

export function selectKillFeed(events: readonly PubgKillFeedEvent[], squadId: string): PubgKillFeedEvent[] {
  return events.filter((event) => !squadId || event.squadId === squadId)
    .sort((a, b) => b.timestamp - a.timestamp || a.eventId.localeCompare(b.eventId, 'en'));
}
