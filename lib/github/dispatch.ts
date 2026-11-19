import "server-only";

// Lanza el workflow de la herramienta (workflow_dispatch). GitHub responde 204 sin cuerpo;
// la URL del run la registra el propio runner al arrancar (send-to-supabase.js start).
export async function dispatchWorkflow(opts: {
  repo: string;          // "Sahueson/qa-playwright"
  workflowFile: string;  // "run-tests.yml"
  ref?: string;
  inputs: Record<string, string>;
}): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Falta GITHUB_TOKEN");

  const res = await fetch(
    `https://api.github.com/repos/${opts.repo}/actions/workflows/${opts.workflowFile}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: opts.ref ?? "main", inputs: opts.inputs }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!res.ok) {
    throw new Error(`GitHub dispatch ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
