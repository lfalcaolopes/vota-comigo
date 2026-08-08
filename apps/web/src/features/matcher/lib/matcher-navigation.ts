export type MatcherNavigationIntent = "step" | "guard";
export type MatcherNavigationMethod = "push" | "replace";

export function getMatcherNavigationMethod(
  intent: MatcherNavigationIntent,
): MatcherNavigationMethod {
  if (intent === "guard") return "replace";
  return "push";
}
