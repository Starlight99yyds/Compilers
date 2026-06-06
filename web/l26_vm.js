"use strict";

class L26Error extends Error {
  constructor(line, message) {
    super(message);
    this.name = "L26Error";
    this.line = line;
  }
}

class ParseError extends Error {
  constructor(line, message) {
    super(message);
    this.name = "ParseError";
    this.line = line;
  }
}

const KEYWORDS = new Set([
  "int",
  "bool",
  "set",
  "if",
  "else",
  "while",
  "write",
  "read",
  "add",
  "remove",
  "true",
  "false",
  "union",
  "inter",
  "in",
  "isempty",
]);

function tokenize(source) {
  const tokens = [];
  let i = 0;
  let line = 1;

  const push = (type, value = type) => {
    tokens.push({ type, value, line });
  };

  while (i < source.length) {
    const ch = source[i];

    if (ch === "\n") {
      line += 1;
      i += 1;
      continue;
    }
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (source.startsWith("//", i)) {
      i += 2;
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }
    if (source.startsWith("/*", i)) {
      i += 2;
      while (i < source.length && !source.startsWith("*/", i)) {
        if (source[i] === "\n") line += 1;
        i += 1;
      }
      if (!source.startsWith("*/", i)) {
        throw new ParseError(line, "块注释未闭合");
      }
      i += 2;
      continue;
    }

    const two = source.slice(i, i + 2);
    if (["||", "&&", "<=", ">=", "==", "!="].includes(two)) {
      push(two);
      i += 2;
      continue;
    }

    if ("{}();,=+-*/!<>".includes(ch)) {
      push(ch);
      i += 1;
      continue;
    }

    if (/\d/.test(ch)) {
      let start = i;
      while (i < source.length && /\d/.test(source[i])) i += 1;
      const text = source.slice(start, i);
      push("NUM", Number(text));
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let start = i;
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) i += 1;
      const text = source.slice(start, i);
      if (KEYWORDS.has(text)) {
        push(text);
      } else {
        push("ID", text);
      }
      continue;
    }

    throw new ParseError(line, `非法字符 '${ch}'`);
  }

  tokens.push({ type: "EOF", value: null, line });
  return tokens;
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset] || this.tokens[this.tokens.length - 1];
  }

  at(type) {
    return this.peek().type === type;
  }

  consume(type, desc = type) {
    const t = this.peek();
    if (t.type !== type) {
      throw new ParseError(t.line, `期望 ${desc}，遇到 ${t.type}`);
    }
    this.pos += 1;
    return t;
  }

  parseProgram() {
    const block = this.parseBlock();
    this.consume("EOF", "文件结束");
    return { type: "Program", block };
  }

  parseBlock() {
    const start = this.consume("{");
    const decls = [];
    while (this.at("int") || this.at("bool") || this.at("set")) {
      decls.push(this.parseDecl());
    }
    const stmts = [];
    while (this.isStmtStart()) {
      stmts.push(this.parseStmt());
    }
    this.consume("}");
    return { type: "Block", line: start.line, decls, stmts };
  }

  parseDecl() {
    const typeTok = this.peek();
    this.pos += 1;
    const idTok = this.consume("ID", "标识符");
    this.consume(";");
    return { type: "Decl", line: typeTok.line, varType: typeTok.type, name: idTok.value };
  }

  isStmtStart() {
    const t = this.peek().type;
    return t === "ID" || t === "if" || t === "while" || t === "write" || t === "read" || t === "add" || t === "remove" || t === "{";
  }

  parseStmt() {
    const t = this.peek().type;
    if (t === "{") return this.parseBlock();
    if (t === "if") return this.parseIf();
    if (t === "while") return this.parseWhile();
    if (t === "write") return this.parseWrite();
    if (t === "read") return this.parseRead();
    if (t === "add" || t === "remove") return this.parseSetOp();
    if (t === "ID") return this.parseAssign();
    throw new ParseError(this.peek().line, "无法识别的语句");
  }

  parseAssign() {
    const idTok = this.consume("ID", "标识符");
    this.consume("=");
    const expr = this.parseExpr(new Set([";"]));
    this.consume(";");
    return { type: "Assign", line: idTok.line, name: idTok.value, expr };
  }

  parseIf() {
    const kw = this.consume("if");
    this.consume("(");
    const cond = this.parseBexpr();
    this.consume(")");
    const thenStmt = this.parseStmt();
    let elseStmt = null;
    if (this.at("else")) {
      this.consume("else");
      elseStmt = this.parseStmt();
    }
    return { type: "If", line: kw.line, cond, thenStmt, elseStmt };
  }

  parseWhile() {
    const kw = this.consume("while");
    this.consume("(");
    const cond = this.parseBexpr();
    this.consume(")");
    const stmt = this.parseStmt();
    return { type: "While", line: kw.line, cond, stmt };
  }

  parseWrite() {
    const kw = this.consume("write");
    const expr = this.parseExpr(new Set([";"]));
    this.consume(";");
    return { type: "Write", line: kw.line, expr };
  }

  parseRead() {
    const kw = this.consume("read");
    const idTok = this.consume("ID", "标识符");
    this.consume(";");
    return { type: "Read", line: kw.line, name: idTok.value };
  }

  parseSetOp() {
    const kw = this.peek();
    this.pos += 1;
    const idTok = this.consume("ID", "集合标识符");
    const expr = this.parseAexpr();
    this.consume(";");
    return { type: "SetOp", line: kw.line, op: kw.type, name: idTok.value, expr };
  }

  parseExpr(terminators) {
    if (this.at("{")) return this.parseSetLiteral();
    if (this.at("ID") && (this.peek(1).type === "union" || this.peek(1).type === "inter")) {
      return this.parseSetBinary();
    }

    const begin = this.pos;
    try {
      const b = this.parseBexpr();
      if (terminators.has(this.peek().type)) return b;
      this.pos = begin;
    } catch (err) {
      if (!(err instanceof ParseError)) throw err;
      this.pos = begin;
    }

    return this.parseAexpr();
  }

  parseSetLiteral() {
    const open = this.consume("{");
    const items = [];
    if (!this.at("}")) {
      items.push(this.parseAexpr());
      while (this.at(",")) {
        this.consume(",");
        items.push(this.parseAexpr());
      }
    }
    this.consume("}");
    return { type: "SetLiteral", line: open.line, items };
  }

  parseSetBinary() {
    const left = this.consume("ID", "集合标识符");
    const opTok = this.peek();
    if (opTok.type !== "union" && opTok.type !== "inter") {
      throw new ParseError(opTok.line, "期望 union 或 inter");
    }
    this.pos += 1;
    const right = this.consume("ID", "集合标识符");
    return {
      type: "SetBinary",
      line: left.line,
      op: opTok.type,
      left: left.value,
      right: right.value,
    };
  }

  parseAexpr() {
    let node = this.parseAterm();
    while (this.at("+") || this.at("-")) {
      const op = this.peek().type;
      const line = this.peek().line;
      this.pos += 1;
      const right = this.parseAterm();
      node = { type: "Arith", line, op, left: node, right };
    }
    return node;
  }

  parseAterm() {
    let node = this.parseAfactor();
    while (this.at("*") || this.at("/")) {
      const op = this.peek().type;
      const line = this.peek().line;
      this.pos += 1;
      const right = this.parseAfactor();
      node = { type: "Arith", line, op, left: node, right };
    }
    return node;
  }

  parseAfactor() {
    if (this.at("NUM")) {
      const tok = this.consume("NUM");
      return { type: "IntLiteral", line: tok.line, value: tok.value };
    }
    if (this.at("ID")) {
      const tok = this.consume("ID");
      return { type: "VarRef", line: tok.line, name: tok.value };
    }
    if (this.at("(")) {
      const lp = this.consume("(");
      const expr = this.parseAexpr();
      this.consume(")");
      return { type: "ParenA", line: lp.line, expr };
    }
    throw new ParseError(this.peek().line, "无效的算术因子");
  }

  parseBexpr() {
    let node = this.parseBterm();
    while (this.at("||")) {
      const opTok = this.consume("||");
      const right = this.parseBterm();
      node = { type: "Logic", line: opTok.line, op: "||", left: node, right };
    }
    return node;
  }

  parseBterm() {
    let node = this.parseBfactor();
    while (this.at("&&")) {
      const opTok = this.consume("&&");
      const right = this.parseBfactor();
      node = { type: "Logic", line: opTok.line, op: "&&", left: node, right };
    }
    return node;
  }

  parseBfactor() {
    if (this.at("true")) {
      const tok = this.consume("true");
      return { type: "BoolLiteral", line: tok.line, value: true };
    }
    if (this.at("false")) {
      const tok = this.consume("false");
      return { type: "BoolLiteral", line: tok.line, value: false };
    }
    if (this.at("!")) {
      const tok = this.consume("!");
      const expr = this.parseBfactor();
      return { type: "Not", line: tok.line, expr };
    }
    if (this.at("isempty")) {
      const kw = this.consume("isempty");
      this.consume("(");
      const idTok = this.consume("ID", "集合标识符");
      this.consume(")");
      return { type: "IsEmpty", line: kw.line, name: idTok.value };
    }

    if (!this.at("(")) {
      const left = this.parseAexpr();
      if (this.at("in")) {
        const inTok = this.consume("in");
        const idTok = this.consume("ID", "集合标识符");
        return { type: "In", line: inTok.line, element: left, setName: idTok.value };
      }

      const op = this.peek().type;
      if (!["<", "<=", ">", ">=", "==", "!="].includes(op)) {
        throw new ParseError(this.peek().line, "关系表达式缺少比较运算符");
      }
      this.pos += 1;
      const right = this.parseAexpr();
      return { type: "Rel", line: this.peek(-1).line, op, left, right };
    }

    const saved = this.pos;
    try {
      const left = this.parseAexpr();
      if (this.at("in")) {
        const inTok = this.consume("in");
        const idTok = this.consume("ID", "集合标识符");
        return { type: "In", line: inTok.line, element: left, setName: idTok.value };
      }

      const op = this.peek().type;
      if (["<", "<=", ">", ">=", "==", "!="].includes(op)) {
        this.pos += 1;
        const right = this.parseAexpr();
        return { type: "Rel", line: this.peek(-1).line, op, left, right };
      }
    } catch (err) {
      if (!(err instanceof ParseError)) throw err;
    }
    this.pos = saved;

    const lp = this.consume("(");
    const expr = this.parseBexpr();
    this.consume(")");
    return { type: "ParenB", line: lp.line, expr };
  }
}

class Runtime {
  constructor(ast, inputText) {
    this.ast = ast;
    this.scopes = [];
    this.output = [];
    this.input = String(inputText || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    this.inputPos = 0;
  }

  run() {
    this.execBlock(this.ast.block);
    return this.output.join("\n");
  }

  pushScope() {
    this.scopes.push(new Map());
  }

  popScope() {
    this.scopes.pop();
  }

  currentScope() {
    return this.scopes[this.scopes.length - 1];
  }

  defineVar(line, type, name) {
    const scope = this.currentScope();
    if (scope.has(name)) {
      throw new L26Error(line, `重复声明变量 ${name}`);
    }
    if (type === "int") scope.set(name, { type, value: 0 });
    else if (type === "bool") scope.set(name, { type, value: false });
    else scope.set(name, { type, value: [] });
  }

  resolve(name, line) {
    for (let i = this.scopes.length - 1; i >= 0; i -= 1) {
      if (this.scopes[i].has(name)) return this.scopes[i].get(name);
    }
    throw new L26Error(line, `变量 ${name} 未声明`);
  }

  cloneValue(type, value) {
    if (type === "set") return [...value];
    return value;
  }

  expectType(actual, expected, line, message) {
    if (actual !== expected) {
      throw new L26Error(line, message || `类型不匹配，期望 ${expected}，实际 ${actual}`);
    }
  }

  formatValue(v) {
    if (v.type === "int") return String(v.value);
    if (v.type === "bool") return v.value ? "1" : "0";
    const sorted = [...new Set(v.value)].sort((a, b) => a - b);
    return `{${sorted.join(", ")}}`;
  }

  evalExpr(node) {
    switch (node.type) {
      case "IntLiteral":
        return { type: "int", value: node.value };
      case "BoolLiteral":
        return { type: "bool", value: node.value };
      case "VarRef": {
        const slot = this.resolve(node.name, node.line);
        return { type: slot.type, value: this.cloneValue(slot.type, slot.value) };
      }
      case "ParenA":
      case "ParenB":
        return this.evalExpr(node.expr);
      case "Arith": {
        const l = this.evalExpr(node.left);
        const r = this.evalExpr(node.right);
        this.expectType(l.type, "int", node.line, "算术表达式左侧必须是 int");
        this.expectType(r.type, "int", node.line, "算术表达式右侧必须是 int");
        if (node.op === "+") return { type: "int", value: l.value + r.value };
        if (node.op === "-") return { type: "int", value: l.value - r.value };
        if (node.op === "*") return { type: "int", value: l.value * r.value };
        if (r.value === 0) throw new L26Error(node.line, "除数不能为 0");
        return { type: "int", value: Math.trunc(l.value / r.value) };
      }
      case "Rel": {
        const l = this.evalExpr(node.left);
        const r = this.evalExpr(node.right);
        this.expectType(l.type, "int", node.line, "关系运算左侧必须是 int");
        this.expectType(r.type, "int", node.line, "关系运算右侧必须是 int");
        let result = false;
        if (node.op === "<") result = l.value < r.value;
        else if (node.op === "<=") result = l.value <= r.value;
        else if (node.op === ">") result = l.value > r.value;
        else if (node.op === ">=") result = l.value >= r.value;
        else if (node.op === "==") result = l.value === r.value;
        else result = l.value !== r.value;
        return { type: "bool", value: result };
      }
      case "Not": {
        const v = this.evalExpr(node.expr);
        this.expectType(v.type, "bool", node.line, "! 后必须是 bool");
        return { type: "bool", value: !v.value };
      }
      case "Logic": {
        const l = this.evalExpr(node.left);
        const r = this.evalExpr(node.right);
        this.expectType(l.type, "bool", node.line, "逻辑表达式左侧必须是 bool");
        this.expectType(r.type, "bool", node.line, "逻辑表达式右侧必须是 bool");
        if (node.op === "&&") return { type: "bool", value: l.value && r.value };
        return { type: "bool", value: l.value || r.value };
      }
      case "SetLiteral": {
        const arr = [];
        for (const item of node.items) {
          const v = this.evalExpr(item);
          this.expectType(v.type, "int", node.line, "集合元素必须是 int 表达式");
          arr.push(v.value);
        }
        const unique = [...new Set(arr)];
        if (unique.length > 200) throw new L26Error(node.line, "集合元素数量超过 200");
        return { type: "set", value: unique };
      }
      case "SetBinary": {
        const l = this.resolve(node.left, node.line);
        const r = this.resolve(node.right, node.line);
        this.expectType(l.type, "set", node.line, "union/inter 左操作数必须是 set");
        this.expectType(r.type, "set", node.line, "union/inter 右操作数必须是 set");
        const ls = new Set(l.value);
        const rs = new Set(r.value);
        let result = [];
        if (node.op === "union") result = [...new Set([...ls, ...rs])];
        else result = [...ls].filter((x) => rs.has(x));
        if (result.length > 200) throw new L26Error(node.line, "集合元素数量超过 200");
        return { type: "set", value: result };
      }
      case "In": {
        const e = this.evalExpr(node.element);
        this.expectType(e.type, "int", node.line, "in 左侧必须是 int 表达式");
        const setVar = this.resolve(node.setName, node.line);
        this.expectType(setVar.type, "set", node.line, "in 右侧必须是 set 变量");
        return { type: "bool", value: setVar.value.includes(e.value) };
      }
      case "IsEmpty": {
        const setVar = this.resolve(node.name, node.line);
        this.expectType(setVar.type, "set", node.line, "isempty 参数必须是 set 变量");
        return { type: "bool", value: setVar.value.length === 0 };
      }
      default:
        throw new L26Error(node.line || 1, `未知表达式节点 ${node.type}`);
    }
  }

  execBlock(block) {
    this.pushScope();
    for (const decl of block.decls) {
      this.defineVar(decl.line, decl.varType, decl.name);
    }
    for (const stmt of block.stmts) {
      this.execStmt(stmt);
    }
    this.popScope();
  }

  execStmt(stmt) {
    switch (stmt.type) {
      case "Block":
        this.execBlock(stmt);
        return;
      case "Assign": {
        const slot = this.resolve(stmt.name, stmt.line);
        const value = this.evalExpr(stmt.expr);
        this.expectType(value.type, slot.type, stmt.line, `变量 ${stmt.name} 类型不匹配`);
        slot.value = this.cloneValue(value.type, value.value);
        return;
      }
      case "Write": {
        const v = this.evalExpr(stmt.expr);
        this.output.push(this.formatValue(v));
        return;
      }
      case "Read": {
        const slot = this.resolve(stmt.name, stmt.line);
        if (this.inputPos >= this.input.length) {
          throw new L26Error(stmt.line, "read 输入不足");
        }
        const raw = this.input[this.inputPos++];
        if (slot.type === "int") {
          const n = Number(raw);
          if (!Number.isInteger(n)) {
            throw new L26Error(stmt.line, `read 需要整数，实际输入 ${raw}`);
          }
          slot.value = n;
          return;
        }
        if (slot.type === "bool") {
          if (raw === "1" || /^true$/i.test(raw)) slot.value = true;
          else if (raw === "0" || /^false$/i.test(raw)) slot.value = false;
          else throw new L26Error(stmt.line, `read 需要布尔值(0/1/true/false)，实际输入 ${raw}`);
          return;
        }
        throw new L26Error(stmt.line, "当前 read 仅支持 int/bool 变量");
      }
      case "If": {
        const cond = this.evalExpr(stmt.cond);
        this.expectType(cond.type, "bool", stmt.line, "if 条件必须是 bool");
        if (cond.value) this.execStmt(stmt.thenStmt);
        else if (stmt.elseStmt) this.execStmt(stmt.elseStmt);
        return;
      }
      case "While": {
        let guard = 0;
        while (true) {
          guard += 1;
          if (guard > 100000) throw new L26Error(stmt.line, "while 循环次数过多，疑似死循环");
          const cond = this.evalExpr(stmt.cond);
          this.expectType(cond.type, "bool", stmt.line, "while 条件必须是 bool");
          if (!cond.value) break;
          this.execStmt(stmt.stmt);
        }
        return;
      }
      case "SetOp": {
        const slot = this.resolve(stmt.name, stmt.line);
        this.expectType(slot.type, "set", stmt.line, `${stmt.op} 目标必须是 set`);
        const v = this.evalExpr(stmt.expr);
        this.expectType(v.type, "int", stmt.line, `${stmt.op} 参数必须是 int 表达式`);
        if (stmt.op === "add") {
          if (!slot.value.includes(v.value)) {
            if (slot.value.length >= 200) {
              throw new L26Error(stmt.line, "集合元素数量超过 200");
            }
            slot.value.push(v.value);
          }
        } else {
          slot.value = slot.value.filter((x) => x !== v.value);
        }
        return;
      }
      default:
        throw new L26Error(stmt.line || 1, `未知语句节点 ${stmt.type}`);
    }
  }
}

function runProgram(source, inputText) {
  try {
    const tokens = tokenize(source);
    const parser = new Parser(tokens);
    const ast = parser.parseProgram();
    const runtime = new Runtime(ast, inputText);
    const output = runtime.run();
    return { ok: true, output };
  } catch (err) {
    if (err instanceof ParseError || err instanceof L26Error) {
      return { ok: false, line: err.line, stderr: `Runtime error at line ${err.line}: ${err.message}` };
    }
    return { ok: false, line: 1, stderr: `Runtime error at line 1: ${err.message || String(err)}` };
  }
}

module.exports = {
  runProgram,
};
