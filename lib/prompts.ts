/** Firestore document contract for `prompts/{promptId}`. */
export type PromptType = "base" | "composite";

export interface PromptDocument {
  /** Firestore document ID. Keep this in sync with the path. */
  promptId: string;
  title: string;
  type: PromptType;
  /** Template text. Dynamic values use {{variableName}}. */
  content: string;
  /** Lowercase slugs, queried with array-contains. */
  topics: string[];
  /** Ordered references. Empty for base prompts. */
  components: Array<{ promptId: string; order: number }>;
  /** Derived from content; update whenever content changes. */
  variables: string[];
  metadata: {
    author: string;
    version: number;
    isPublic: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export function extractVariables(content: string): string[] {
  return [...new Set(Array.from(content.matchAll(/{{\s*([\w.-]+)\s*}}/g), (match) => match[1]))];
}

/** Resolve component references in order. The visited set prevents cycles. */
export function resolvePrompt(
  promptId: string,
  getPrompt: (id: string) => PromptDocument | undefined,
  visited = new Set<string>(),
): string {
  if (visited.has(promptId)) throw new Error(`Circular prompt composition detected at "${promptId}".`);
  const prompt = getPrompt(promptId);
  if (!prompt) throw new Error(`Prompt "${promptId}" was not found.`);
  visited.add(promptId);
  const parts = prompt.components
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(({ promptId: childId }) => resolvePrompt(childId, getPrompt, visited));
  parts.push(prompt.content);
  visited.delete(promptId);
  return parts.filter(Boolean).join("\n\n");
}
