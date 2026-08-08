export type MatcherNavigationIntent = "step" | "guard" | "position";
export type MatcherNavigationMethod = "push" | "replace";

export function getMatcherNavigationMethod(
  intent: MatcherNavigationIntent,
): MatcherNavigationMethod {
  if (intent === "guard" || intent === "position") return "replace";
  return "push";
}
