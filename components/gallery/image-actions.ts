"use client";

/** Shared client-side actions for a generated image. */

export function downloadOutput(outputId: string, format: "png" | "jpeg" = "png") {
  // Routed through our API so ownership is checked and the storage path stays private.
  window.location.href = `/api/outputs/${outputId}/download?format=${format}`;
}

export async function toggleFavorite(
  outputId: string,
  next: boolean,
): Promise<boolean> {
  const response = await fetch(`/api/outputs/${outputId}/favorite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isFavorite: next }),
  });

  if (!response.ok) throw new Error("Could not update that image.");
  const data = (await response.json()) as { isFavorite: boolean };
  return data.isFavorite;
}

export async function deleteGeneration(generationId: string): Promise<void> {
  const response = await fetch(`/api/generations/${generationId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Could not delete that generation.");
  }
}

export async function createVariation(generationId: string): Promise<string> {
  const response = await fetch(`/api/generations/${generationId}/variation`, {
    method: "POST",
  });

  const data = (await response.json()) as {
    generationId?: string;
    error?: string;
  };

  if (!response.ok || !data.generationId) {
    throw new Error(data.error ?? "Could not create a variation.");
  }

  return data.generationId;
}

export async function copyPrompt(prompt: string): Promise<void> {
  await navigator.clipboard.writeText(prompt);
}
