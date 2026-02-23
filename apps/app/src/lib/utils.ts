export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).map(i => typeof i === 'string' ? i : '').join(" ")
}
