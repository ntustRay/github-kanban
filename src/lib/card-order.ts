import type { Card, Status } from "./model";

export function compareCards(a: Card, b: Card) {
  return a.position - b.position || a.fullName.localeCompare(b.fullName);
}

// Only the moved card changes: concurrent saves and filtered-out cards stay intact.
export function placeCard(
  cards: Card[],
  activeId: string,
  status: Status,
  overId: string | null,
  after = false,
) {
  const peers = cards
    .filter((card) => card.status === status && card.repoId !== activeId)
    .sort(compareCards);
  const overIndex = peers.findIndex((card) => card.repoId === overId);
  const index = overIndex < 0 ? peers.length : overIndex + Number(after);
  const before = peers[index - 1];
  const next = peers[index];
  const position =
    before && next
      ? before.position + (next.position - before.position) / 2
      : before
        ? before.position + 1024
        : next
          ? next.position - 1024
          : 0;
  return { status, position };
}
