export function SplitBar({
  shareA,
  size,
  label,
}: {
  shareA: number;
  size: "lg" | "sm";
  label: string;
}) {
  return (
    <div aria-label={label} className="relative" role="img">
      <div
        className={`flex w-full overflow-hidden rounded-full ${size === "lg" ? "h-5" : "h-2"}`}
      >
        <div
          className="bg-series-a transition-[flex-basis] duration-500 ease-standard motion-reduce:transition-none"
          style={{ flexBasis: `${shareA * 100}%` }}
        />
        <div className="flex-1 bg-series-b" />
      </div>
      <span
        aria-hidden="true"
        className={`absolute left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-ink ${size === "lg" ? "-top-1.5 -bottom-1.5" : "-top-1 -bottom-1"}`}
      />
    </div>
  );
}
