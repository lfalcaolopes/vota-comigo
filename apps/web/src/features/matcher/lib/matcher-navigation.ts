export type MatcherNavigationIntent =
  | "step"
  | "guard"
  | "position"
  | "filter";
export type MatcherNavigationMethod = "push" | "replace";

export function getMatcherNavigationMethod(
  intent: MatcherNavigationIntent,
): MatcherNavigationMethod {
  if (intent === "guard" || intent === "position" || intent === "filter") {
    return "replace";
  }
  return "push";
}
