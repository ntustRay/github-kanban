import { describe, expect, test } from "bun:test";
import { compareCards, placeCard } from "../src/lib/card-order";
import { demoCards } from "../src/lib/demo";
import { type Card, editSchema } from "../src/lib/model";

const base = demoCards[0];
const card = (repoId: string, position: number): Card => ({
  ...base,
  repoId,
  fullName: `demo/${repoId}`,
  status: "backlog",
  position,
});
describe("persistent card ordering", () => {
  const cards = [
    card("a", 0),
    card("hidden", 10),
    card("b", 20),
    card("c", 30),
  ];
  test("reorders within a column without changing neighbours", () => {
    const changes = placeCard(cards, "c", "backlog", "b");
    expect(changes.position).toBe(15);
    expect(
      [
        ...cards.map((item) =>
          item.repoId === "c" ? { ...item, ...changes } : item,
        ),
      ]
        .sort(compareCards)
        .map((item) => item.repoId),
    ).toEqual(["a", "hidden", "c", "b"]);
    expect(cards[3].position).toBe(30);
  });
  test("inserts after a neighbour, preserving filtered-out cards", () => {
    expect(placeCard(cards, "c", "backlog", "a", true).position).toBe(5);
  });
  test("moves to an empty Legacy column", () => {
    expect(placeCard(cards, "a", "legacy", null)).toEqual({
      status: "legacy",
      position: 0,
    });
  });
  test("inserts at either end", () => {
    expect(placeCard(cards, "c", "backlog", "a").position).toBe(-1024);
    expect(placeCard(cards, "a", "backlog", null).position).toBe(1054);
  });
  test("uses deterministic names to resolve existing position ties", () => {
    expect(
      [card("b", 0), card("a", 0)]
        .sort(compareCards)
        .map((item) => item.repoId),
    ).toEqual(["a", "b"]);
  });
  test("API accepts Legacy and position-only edits with a version", () => {
    expect(
      editSchema.safeParse({ status: "legacy", position: -0.5, version: 1 })
        .success,
    ).toBe(true);
    expect(editSchema.safeParse({ position: 4, version: 1 }).success).toBe(
      true,
    );
    for (const position of [Infinity, NaN, 1e13])
      expect(editSchema.safeParse({ position, version: 1 }).success).toBe(
        false,
      );
    expect(editSchema.safeParse({ position: 4 }).success).toBe(false);
  });
});
