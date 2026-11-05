// Engineering-sheet corner marks and a figure label framing a drawing or render. The parent
// figure must be position: relative; the marks draw in when its [data-reveal] section appears.
export default function FigureMarks({ label }: { label: string }) {
  return (
    <>
      <span className="fig-marks" aria-hidden="true" />
      <span className="fig-label" aria-hidden="true">{label}</span>
    </>
  );
}
