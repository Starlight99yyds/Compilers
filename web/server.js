const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { runProgram } = require("./l26_vm");

const PORT = 4399;
const WEB_ROOT = __dirname;
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PARSER_EXE = path.join(PROJECT_ROOT, "l26.exe");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function sendJson(res, code, payload) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function ensureMessage(result, fallback) {
  if (result.message) return result;
  const stderr = typeof result.stderr === "string" ? result.stderr.trim() : "";
  const stdout = typeof result.stdout === "string" ? result.stdout.trim() : "";
  const message = result.ok ? "OK" : stderr || stdout || fallback;
  return { ...result, message };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("请求体过大"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error("JSON 格式错误"));
      }
    });
    req.on("error", reject);
  });
}

function runCommand(bin, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      cwd: PROJECT_ROOT,
      shell: true,
      ...options,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function buildParser() {
  const logs = [];
  const steps = [
    ["win_bison", ["-d", "-o", "l26.tab.c", "l26.y"]],
    ["win_flex", ["-o", "l26.flex.c", "l26.l"]],
    ["gcc", ["l26.tab.c", "l26.flex.c", "-o", "l26.exe"]],
  ];

  for (const [bin, args] of steps) {
    const result = await runCommand(bin, args);
    logs.push(`> ${bin} ${args.join(" ")}`);
    if (result.stdout.trim()) logs.push(result.stdout.trim());
    if (result.stderr.trim()) logs.push(result.stderr.trim());
    if (result.code !== 0) {
      return { ok: false, stdout: logs.join("\n"), stderr: `命令失败: ${bin}`, exitCode: result.code };
    }
  }

  return { ok: true, stdout: logs.join("\n"), stderr: "", exitCode: 0 };
}

async function parseSource(source) {
  try {
    await fsp.access(PARSER_EXE);
  } catch (err) {
    return { ok: false, stdout: "", stderr: "未找到 l26.exe，请先执行编译。", exitCode: 127 };
  }

  return new Promise((resolve) => {
    const child = spawn(PARSER_EXE, [], { cwd: PROJECT_ROOT, shell: false });
    let stdout = "";
    let stderr = "";
    let killedByTimeout = false;

    const timer = setTimeout(() => {
      killedByTimeout = true;
      child.kill();
    }, 8000);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      clearTimeout(timer);
      if (killedByTimeout) {
        resolve({ ok: false, stdout, stderr: `${stderr}\n执行超时，可能陷入等待输入。`, exitCode: -1 });
        return;
      }
      resolve({ ok: code === 0, stdout, stderr, exitCode: code });
    });

    child.stdin.write(source);
    if (!source.endsWith("\n")) child.stdin.write("\n");
    child.stdin.end();
  });
}

async function runSource(source, input) {
  const parseResult = await parseSource(source);
  if (!parseResult.ok) {
    return {
      ok: false,
      phase: "parse",
      parseStdout: parseResult.stdout || "",
      parseStderr: parseResult.stderr || "",
      output: "",
      stderr: parseResult.stderr || "语法检查失败。",
      line: null,
    };
  }

  const runtimeResult = runProgram(source, input);
  if (!runtimeResult.ok) {
    return {
      ok: false,
      phase: "runtime",
      parseStdout: parseResult.stdout || "",
      parseStderr: parseResult.stderr || "",
      output: "",
      stderr: runtimeResult.stderr || "程序运行失败。",
      line: runtimeResult.line || null,
    };
  }

  return {
    ok: true,
    phase: "ok",
    parseStdout: parseResult.stdout || "",
    parseStderr: parseResult.stderr || "",
    output: runtimeResult.output || "",
    stderr: "",
  };
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(WEB_ROOT, normalized);

  if (!filePath.startsWith(WEB_ROOT)) {
    sendJson(res, 403, { message: "禁止访问" });
    return;
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const data = await fsp.readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch (err) {
    sendJson(res, 404, { message: "资源不存在" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    const parserBuilt = fs.existsSync(PARSER_EXE);
    sendJson(res, 200, { ok: true, parserBuilt });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/build") {
    const result = ensureMessage(await buildParser(), "构建失败。");
    sendJson(res, result.ok ? 200 : 500, result);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/parse") {
    try {
      const body = await readBody(req);
      const source = String(body.source || "");
      const result = ensureMessage(await parseSource(source), "语法检查失败。");
      sendJson(res, result.ok ? 200 : 400, result);
    } catch (err) {
      sendJson(res, 400, { ok: false, message: err.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/run") {
    try {
      const body = await readBody(req);
      const source = String(body.source || "");
      const input = String(body.input || "");
      const result = ensureMessage(await runSource(source, input), "运行失败。");
      sendJson(res, result.ok ? 200 : 400, result);
    } catch (err) {
      sendJson(res, 400, { ok: false, message: err.message });
    }
    return;
  }

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { message: "方法不允许" });
});

server.listen(PORT, () => {
  console.log(`L26 Web UI running: http://localhost:${PORT}`);
});
