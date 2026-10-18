/** Switch directly to the other visible theme, independent of the OS setting. */
export function nextThemeMode(mode: 'ink' | 'paper'): 'ink' | 'paper' {
  return mode === 'ink' ? 'paper' : 'ink';
}
