/** Round axis ticks from 0 to ≥ max. */
export function niceTicks(max: number, count: number): number[] {
  if (!(max > 0)) return [0]
  const raw = max / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
  const ticks: number[] = []
  for (let t = 0; t <= max + step * 0.999; t += step) ticks.push(Math.round(t))
  return ticks
}
