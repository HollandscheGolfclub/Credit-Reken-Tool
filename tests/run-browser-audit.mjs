import { readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const debugPort = Number(process.argv[2] || 9227);
const mimeTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer((request, response) => {
  const pathname = request.url.split("?")[0];
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^[/\\]+/, "");
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(process.cwd(), safePath);
  const stream = createReadStream(filePath);
  stream.on("open", () => {
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    stream.pipe(response);
  });
  stream.on("error", () => {
    if (response.headersSent) return;
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Niet gevonden");
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const serverAddress = server.address();
const pageUrl = `http://127.0.0.1:${serverAddress.port}/?hgc-audit`;
const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 0;

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

await command("Page.enable");
await command("Runtime.enable");
const loaded = new Promise((resolve) => {
  const listener = (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Page.loadEventFired") {
      socket.removeEventListener("message", listener);
      resolve();
    }
  };
  socket.addEventListener("message", listener);
});
await command("Page.navigate", { url: pageUrl });
await loaded;

const auditSource = await readFile(new URL("./audit-matrix.js", import.meta.url), "utf8");
await command("Runtime.evaluate", { expression: auditSource });
const evaluation = await command("Runtime.evaluate", {
  expression: "JSON.stringify({ matrix: window.runHgcMatrixAudit(), sweep: window.runHgcRoundSweepAudit() })",
  returnByValue: true,
  awaitPromise: true,
});
if (evaluation.exceptionDetails) throw new Error(evaluation.exceptionDetails.text);
const result = JSON.parse(evaluation.result.value);
process.stdout.write(`${JSON.stringify(result)}\n`);
await command("Browser.close");
await new Promise((resolve) => server.close(resolve));
