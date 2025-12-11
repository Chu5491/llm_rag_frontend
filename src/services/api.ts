export async function checkApiStatus(): Promise<boolean> {
    try {
        const res = await fetch("/api/v1/ollama/status");
        return res.ok;
    } catch (err) {
        return false;
    }
}

export async function generateTestCases(
    endpoint: "/api/v1/rag/generate/file" | "/api/v1/rag/generate/figma",
    model = "exaone3.5:2.4b"
) {
    const res = await fetch(endpoint, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({model}),
    });
    if (!res.ok) throw new Error("generate API failed");
    return res.json();
}
