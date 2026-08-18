import { createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const root = process.cwd();
const port = Number(process.argv[2]) || 8000;
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

createServer((request, response) => {
  const requestedPath = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const safePath = normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = join(root, safePath);
  const stream = createReadStream(filePath);

  stream.on("open", () => {
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    stream.pipe(response);
  });
  stream.on("error", () => {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Niet gevonden");
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`HGC calculator draait op http://127.0.0.1:${port}`);
});
