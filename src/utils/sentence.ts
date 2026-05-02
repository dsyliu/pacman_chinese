export function getBlankIndices(sentence: string): number[] {
  const indices: number[] = [];
  for (let i = 0; i < sentence.length; i++) {
    if (sentence[i] === ' ') indices.push(i);
  }
  return indices;
}
