import { TRPCError } from "@trpc/server";
import type { MenuOptionGroup } from "../shared/restaurant";

export type SelectedOption = { groupId: string; choiceId: string };

export function calculateOptionDelta(customisation: unknown, selections: SelectedOption[]): number {
  const groups = Array.isArray(customisation) ? (customisation as MenuOptionGroup[]) : [];
  const selectedGroupIds = new Set(selections.map(selection => selection.groupId));

  for (const group of groups) {
    if (group.required && !selectedGroupIds.has(group.id)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Choose an option for ${group.label}.` });
    }
  }

  return selections.reduce((total, selection) => {
    const group = groups.find(candidate => candidate.id === selection.groupId);
    const choice = group?.choices.find(candidate => candidate.id === selection.choiceId);
    if (!group || !choice) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This menu customisation is no longer available." });
    }
    return total + choice.priceDeltaPaise;
  }, 0);
}

export function calculateOrderTotals(lines: Array<{ quantity: number; unitPricePaise: number }>, deliveryFeePaise = 0, discountPaise = 0) {
  const itemTotalPaise = lines.reduce((total, line) => total + line.quantity * line.unitPricePaise, 0);
  return {
    itemTotalPaise,
    deliveryFeePaise,
    discountPaise,
    grandTotalPaise: Math.max(0, itemTotalPaise + deliveryFeePaise - discountPaise),
  };
}

