// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapValues<Input extends Record<string, any>, OutputValue>(
  input: Input,
  fn: (value: Input[keyof Input], key: keyof Input) => OutputValue,
): Record<keyof Input, OutputValue> {
  const result: Record<keyof Input, OutputValue> = {} as Record<keyof Input, OutputValue>;

  for (const key in input) {
    result[key] = fn(input[key], key);
  }

  return result;
}
