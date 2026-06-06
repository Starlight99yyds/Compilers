const SAMPLE_1 = `{
    int val;
    set s;
    s = {1,2,3};
    read val;
    if (val in s) {
        add s 10;
        write val;
    }
    while (val > 0) {
        val = val - 1;
        write val;
    }
    write 999;
}`;

const SAMPLE_2 = `{
    int x;
    set s;
    x = 10;
    s = {1,2};
    {
        set x; // 合法：遮蔽外层 int x
        x = {5,6};
        add x 7;
        write x;
        write s;
    }
    write x;
}`;

const editor = document.querySelector("#source-code");
const programInput = document.querySelector("#program-input");
const editorGutter = document.querySelector("#editor-gutter");
const editorHighlight = document.querySelector("#editor-highlight");
const terminalLog = document.querySelector("#terminal-log");
const statusServer = document.querySelector("#status-server");
const statusParser = document.querySelector("#status-parser");
const statusLines = document.querySelector("#status-lines");
const statusChars = document.querySelector("#status-chars");
const btnBuild = document.querySelector("#btn-build");
const btnRun = document.querySelector("#btn-run");

let errorLine = null;

function writeLog(text, mode = "info", options = {}) {
  const prefix = mode === "error" ? "[ERR]" : mode === "success" ? "[OK ]" : "[LOG]";
  const row = document.createElement("div");
  row.className = `log-row log-${mode}`;
  row.textContent = `${prefix} ${text}`;

  if (options.jump && options.line) {
    row.classList.add("log-jump");
    row.title = `点击跳转到第 ${options.line} 行`;
    row.addEventListener("click", () => jumpToLine(options.line));
  }

  terminalLog.appendChild(row);
  terminalLog.scrollTop = terminalLog.scrollHeight;
}

function resetLog() {
  terminalLog.textContent = "";
}

function getLineMetrics() {
  const style = getComputedStyle(editor);
  return {
    lineHeight: parseFloat(style.lineHeight),
    paddingTop: parseFloat(style.paddingTop),
  };
}

function updateGutter() {
  const lines = editor.value.split(/\r?\n/);
  const count = Math.max(lines.length, 1);
  editorGutter.innerHTML = "";

  for (let i = 1; i <= count; i += 1) {
    const span = document.createElement("div");
    span.className = "gutter-line";
    span.textContent = String(i);
    if (errorLine === i) span.classList.add("error-line");
    editorGutter.appendChild(span);
  }
}

function syncEditorChrome() {
  editorGutter.scrollTop = editor.scrollTop;
  if (errorLine) highlightLine(errorLine);
}

function clearHighlight() {
  errorLine = null;
  editorHighlight.hidden = true;
  updateGutter();
}

function highlightLine(lineNum) {
  const { lineHeight, paddingTop } = getLineMetrics();
  errorLine = lineNum;
  updateGutter();
  editorHighlight.hidden = false;
  editorHighlight.style.top = `${paddingTop + (lineNum - 1) * lineHeight - editor.scrollTop}px`;
  editorHighlight.style.height = `${lineHeight}px`;
}

function jumpToLine(lineNum) {
  const lines = editor.value.split(/\r?\n/);
  if (lineNum < 1 || lineNum > lines.length) return;

  let start = 0;
  for (let i = 0; i < lineNum - 1; i += 1) {
    start += lines[i].length + 1;
  }
  const end = start + lines[lineNum - 1].length;
  editor.focus();
  editor.setSelectionRange(start, end);

  const { lineHeight } = getLineMetrics();
  editor.scrollTop = Math.max(0, (lineNum - 1) * lineHeight - editor.clientHeight / 3);
  highlightLine(lineNum);
}

const TOKEN_ZH = {
  ID: "标识符",
  NUM: "数字",
  INT: "int",
  BOOL: "bool",
  SET: "set",
  IF: "if",
  ELSE: "else",
  WHILE: "while",
  WRITE: "write",
  READ: "read",
  ADD: "add",
  REMOVE: "remove",
  TRUE: "true",
  FALSE: "false",
  UNION: "union",
  INTER: "inter",
  IN: "in",
  ISEMPTY: "isempty",
  OR: "||",
  AND: "&&",
  LE: "<=",
  GE: ">=",
  EQ: "==",
  NE: "!=",
  "';'": "分号",
  "'}'": "右花括号",
  "'{'": "左花括号",
  "')'": "右括号",
  "'('": "左括号",
  "'='": "等号",
  "','": "逗号",
  "'+'": "加号",
  "'-'": "减号",
  "'*'": "乘号",
  "'/'": "除号",
  "'!'": "逻辑非",
  "'<'": "小于号",
  "'>'": "大于号",
  "$end": "文件结束",
};

function translateToken(token) {
  const trimmed = String(token || "").trim();
  if (!trimmed) return "未知符号";
  if (TOKEN_ZH[trimmed]) return TOKEN_ZH[trimmed];
  if (/^'.'$/.test(trimmed)) return `符号 ${trimmed}`;
  return trimmed;
}

function splitExpectedList(text) {
  return text
    .split(/\s+or\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(translateToken);
}

function describeParseReason(reason) {
  const msg = String(reason || "").trim();
  if (/非法字符/.test(msg)) return msg;
  if (/块注释未闭合/.test(msg)) return "块注释未闭合";
  if (/^syntax error,?\s*unexpected\s+\$end\s*$/i.test(msg)) {
    return "程序未完整结束（可能缺少右花括号 }）";
  }

  const verbose = msg.match(/^syntax error,?\s*unexpected\s+(.+?),\s*expecting\s+(.+)$/i);
  if (verbose) {
    const got = translateToken(verbose[1]);
    const expectedParts = splitExpectedList(verbose[2]);
    const expected = expectedParts.join(" 或 ");
    if (verbose[2].includes("';'")) return `声明或语句缺少分号 ;（在 ${got} 处）`;
    if (verbose[2].includes("')'")) return `缺少右括号 )（在 ${got} 处）`;
    if (verbose[2].includes("'('")) return `缺少左括号 (（在 ${got} 处）`;
    if (verbose[2].includes("'}'")) return `缺少右花括号 }（在 ${got} 处）`;
    if (verbose[2].includes("','")) return `集合元素之间缺少逗号 ,（在 ${got} 处）`;
    if (verbose[2].includes("'='")) return `赋值语句缺少等号 =（在 ${got} 处）`;
    if (verbose[1].includes("$end")) return `程序未完整结束，仍期望 ${expected}`;
    return `语法不匹配：遇到 ${got}，期望 ${expected}`;
  }
  if (msg === "syntax error") return "语法结构错误";
  return msg.replace(/\.$/, "");
}

function parseLineError(raw) {
  const text = String(raw || "").trim();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const first = lines.find((line) => /(?:Syntax|Runtime) error at line/i.test(line)) || lines[0] || "";
  const match = first.match(/(?:Syntax|Runtime) error at line (\d+):\s*(.+)/i);
  if (!match) {
    return { line: null, summary: text || "未知错误" };
  }
  const line = Number(match[1]);
  const reason = match[2].trim();
  const desc = /^syntax error/i.test(reason) ? describeParseReason(reason) : reason;
  return { line, summary: `第 ${line} 行：${desc}` };
}

function summarizeBuildError(data) {
  const raw = String(data.stderr || data.message || data.stdout || "").trim();
  return raw.split(/\r?\n/).find(Boolean) || "编译失败";
}

function updateStats() {
  const value = editor.value || "";
  const lines = value.length === 0 ? 0 : value.split(/\r?\n/).length;
  statusLines.textContent = `Lines: ${lines}`;
  statusChars.textContent = `Chars: ${value.length}`;
}

function setParserStatus(ok) {
  statusParser.textContent = ok ? "Parser: 已编译" : "Parser: 未编译";
  statusParser.style.color = ok ? "#7af1cc" : "#f0b5c3";
}

async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    data = { message: "服务返回了非 JSON 响应。" };
  }
  return { httpOk: res.ok, status: res.status, data };
}

async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    statusServer.textContent = "Server: 在线";
    statusServer.style.color = "#7af1cc";
    setParserStatus(Boolean(data.parserBuilt));
  } catch (err) {
    statusServer.textContent = "Server: 离线";
    statusServer.style.color = "#ff9eb4";
    writeLog("无法连接本地服务，请先运行 node server.js", "error");
  }
}

async function buildParser() {
  btnBuild.disabled = true;
  writeLog("开始编译解析器");
  try {
    const { httpOk, data } = await api("/api/build", {});
    setParserStatus(Boolean(data.ok));
    if (httpOk && data.ok) {
      writeLog("解析器编译成功", "success");
    } else {
      writeLog(summarizeBuildError(data), "error");
    }
  } catch (err) {
    writeLog(`编译失败：${err.message}`, "error");
  } finally {
    btnBuild.disabled = false;
  }
}

async function runProgram() {
  const source = editor.value;
  const input = programInput.value || "";
  if (!source.trim()) {
    writeLog("请输入待运行源码", "error");
    return;
  }

  btnRun.disabled = true;
  clearHighlight();
  writeLog("开始运行程序（先语法检查）");

  try {
    const { httpOk, data } = await api("/api/run", { source, input });
    if (!httpOk || !data.ok) {
      const err = parseLineError(data.parseStderr || data.stderr || data.message);
      const title = data.phase === "runtime" ? `运行失败：${err.summary}` : err.summary;
      writeLog(title, "error", { jump: Boolean(err.line), line: err.line });
      if (err.line) jumpToLine(err.line);
      return;
    }

    writeLog("语法检查通过", "success");
    if (data.output && data.output.trim()) {
      const lines = data.output.split(/\r?\n/);
      for (const line of lines) {
        writeLog(`程序输出: ${line}`, "success");
      }
    } else {
      writeLog("程序运行完成（无 write 输出）", "success");
    }
  } catch (err) {
    writeLog(`运行失败：${err.message}`, "error");
  } finally {
    btnRun.disabled = false;
  }
}

function exportSource() {
  const content = editor.value || SAMPLE_1;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `l26-test-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  writeLog("已导出测试用例", "success");
}

document.querySelector("#btn-sample-1").addEventListener("click", () => {
  editor.value = SAMPLE_1;
  programInput.value = "2";
  clearHighlight();
  updateStats();
  updateGutter();
  writeLog("已加载样例 1（默认 read 输入为 2）");
});

document.querySelector("#btn-sample-2").addEventListener("click", () => {
  editor.value = SAMPLE_2;
  programInput.value = "";
  clearHighlight();
  updateStats();
  updateGutter();
  writeLog("已加载样例 2");
});

document.querySelector("#btn-build").addEventListener("click", buildParser);
document.querySelector("#btn-run").addEventListener("click", runProgram);
document.querySelector("#btn-export").addEventListener("click", exportSource);
document.querySelector("#btn-clear-log").addEventListener("click", resetLog);

editor.addEventListener("input", () => {
  clearHighlight();
  updateStats();
  updateGutter();
});
editor.addEventListener("scroll", syncEditorChrome);

editor.value = SAMPLE_1;
programInput.value = "2";
updateStats();
updateGutter();
checkHealth();
writeLog("界面初始化完成");
