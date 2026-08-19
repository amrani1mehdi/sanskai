type SparklineProps = {
  points: number[];
  positive: boolean;
  width?: number;
  height?: number;
};

/** 7-day price trace rendered as a plain inline SVG polyline. */
export function Sparkline({
  points,
  positive,
  width = 120,
  height = 36,
}: SparklineProps) {
  if (points.length < 2) {
    return <div style={{ width, height }} aria-hidden />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);

  const d = points
    .map((value, i) => {
      const x = i * step;
      const y = height - ((value - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      role="img"
      aria-label={`7 day trend, ${positive ? "up" : "down"}`}
      className="overflow-visible"
    >
      <path
        d={d}
        stroke={positive ? "hsl(var(--success))" : "hsl(var(--danger))"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
