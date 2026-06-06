# L26 文法覆盖测试集

本文件按 **由简到繁** 组织，覆盖 `README.md` 中 L26 基础文法的 **全部产生式**。  
每个用例为独立程序（一个 `{ ... }` 块），可在 Web 实验台复制运行。

**输出约定**：`int` 输出整数；`bool` 输出 `1`/`0`；`set` 按升序输出，如 `{1, 2, 3}`。

---

## Level 1 · 程序骨架

### 测试 1：空程序

| 覆盖规则 |
|---|
| `<program>` → `<block>` |
| `<block>` → `{` `<decls>` `<stmts>` `}` |
| 空 `<decls>`、空 `<stmts>` |

```l26
{
}
```

**read 输入**：（无）  
**期望输出**：（无）

---

### 测试 2：词法注释

| 覆盖规则 |
|---|
| 单行注释 `//`、块注释 `/* */` |

```l26
{
    int x;
    x = 7; // comment
    write x;
}
```

**期望输出**：
```
7
```

---

## Level 2 · 声明与类型

### 测试 3：`int` 声明与赋值

| 覆盖规则 |
|---|
| `<decl>` → `<type>` `<ID>` `;`，`<type>` → `int` |
| `<assign_stmt>` → `<ID>` `=` `<expr>` `;` |
| `<expr>` → `<aexpr>`，`<afactor>` → `NUM` |

```l26
{
    int n;
    n = 42;
    write n;
}
```

**期望输出**：
```
42
```

---

### 测试 4：`bool` 声明与逻辑常量

| 覆盖规则 |
|---|
| `<type>` → `bool` |
| `<expr>` → `<bexpr>`，`<bfactor>` → `true` \| `false` |

```l26
{
    bool t;
    bool f;
    t = true;
    f = false;
    write t;
    write f;
}
```

**期望输出**：
```
1
0
```

---

### 测试 5：`set` 声明与集合字面量

| 覆盖规则 |
|---|
| `<type>` → `set` |
| `<expr>` → `<set_expr>` → `<set_literal>` |
| 空集 `{}`、非空 `{ aexpr , ... }` |

```l26
{
    set empty;
    set data;
    empty = {};
    data = {3, 1, 2};
    write empty;
    write data;
}
```

**期望输出**：
```
{}
{1, 2, 3}
```

---

## Level 3 · 算术表达式

### 测试 6：加减乘除与括号

| 覆盖规则 |
|---|
| `<aexpr>`、`+`、`-` |
| `<aterm>`、`*`、`/` |
| `<afactor>` → `<ID>` \| `NUM` \| `(` `<aexpr>` `)` |

```l26
{
    int a;
    int b;
    a = 1 + 2 * (3 + 4) - 8 / (1 + 1);
    b = (10 - 3) * 2;
    write a;
    write b;
}
```

**期望输出**：

```
11
14
```

---

## Level 4 · 关系与布尔表达式

### 测试 7：六种关系运算

| 覆盖规则 |
|---|
| `<rel>` → `<aexpr>` (`<`\|`<=`\|`>`\|`>=`\|`==`\|`!=`) `<aexpr>` |
| `<bfactor>` → `<rel>` |

```l26
{
    int x;
    x = 5;
    write x < 6;
    write x <= 5;
    write x > 4;
    write x >= 5;
    write x == 5;
    write x != 4;
}
```

**期望输出**：
```
1
1
1
1
1
1
```

---

### 测试 8：逻辑非、与、或及括号布尔式

| 覆盖规则 |
|---|
| `<bexpr>` → `<bterm>` (`||` `<bterm>`)\* |
| `<bterm>` → `<bfactor>` (`&&` `<bfactor>`)\* |
| `<bfactor>` → `!` `<bfactor>` \| `(` `<bexpr>` `)` |

```l26
{
    write !false;
    write true && false;
    write true || false;
    write (true || false) && !false;
}
```

**期望输出**：
```
1
0
1
1
```

---

### 测试 9：`write` 布尔表达式

| 覆盖规则 |
|---|
| `<io_stmt>` → `write` `<expr>` `;`，`<expr>` → `<bexpr>` |

```l26
{
    int x;
    x = 4;
    write x > 2;
    write x == 10;
}
```

**期望输出**：
```
1
0
```

---

## Level 5 · 输入输出

### 测试 10：`read` 与 `write`

| 覆盖规则 |
|---|
| `<io_stmt>` → `read` `<ID>` `;` |
| `<io_stmt>` → `write` `<expr>` `;` |

```l26
{
    int x;
    read x;
    write x;
    write x + 100;
}
```

**read 输入**：
```
15
```

**期望输出**：
```
15
115
```

---

## Level 6 · 控制流语句

### 测试 11：`if`（无 `else`）

| 覆盖规则 |
|---|
| `<if_stmt>` → `if` `(` `<bexpr>` `)` `<stmt>` |

```l26
{
    int x;
    x = 5;
    if (x < 10)
        write x;
}
```

**期望输出**：
```
5
```

---

### 测试 12：`if-else`

| 覆盖规则 |
|---|
| `<if_stmt>` → `if` `(` `<bexpr>` `)` `<stmt>` `else` `<stmt>` |

```l26
{
    int x;
    x = 3;
    if (x > 10)
        write 100;
    else
        write 200;
}
```

**期望输出**：
```
200
```

---

### 测试 13：`while`

| 覆盖规则 |
|---|
| `<while_stmt>` → `while` `(` `<bexpr>` `)` `<stmt>` |

```l26
{
    int n;
    n = 3;
    while (n >= 0) {
        write n;
        n = n - 1;
    }
}
```

**期望输出**：
```
3
2
1
0
```

---

### 测试 14：嵌套块（语句级 `<block>`）

| 覆盖规则 |
|---|
| `<stmt>` → `<block>` |
| 内层 `<decls>` + `<stmts>` |

```l26
{
    int x;
    x = 1;
    {
        int y;
        y = 9;
        write y;
    }
    write x;
}
```

**期望输出**：
```
9
1
```

---

## Level 7 · 集合表达式与操作

### 测试 15：`add` / `remove`

| 覆盖规则 |
|---|
| `<set_op_stmt>` → `add` `<ID>` `<aexpr>` `;` |
| `<set_op_stmt>` → `remove` `<ID>` `<aexpr>` `;` |

```l26
{
    set s;
    int v;
    s = {1, 2, 3};
    v = 2;
    remove s v;
    add s (v + 10);
    write s;
}
```

**期望输出**：
```
{1, 3, 12}
```

---

### 测试 16：成员检查 `in`

| 覆盖规则 |
|---|
| `<set_test>` → `<aexpr>` `in` `<ID>` |
| `<bfactor>` → `<set_test>` |

```l26
{
    set s;
    int v;
    s = {2, 4, 6};
    v = 4;
    if (v in s)
        write 1;
    else
        write 0;
}
```

**期望输出**：
```
1
```

---

### 测试 17：空集检查 `isempty`

| 覆盖规则 |
|---|
| `<set_test>` → `isempty` `(` `<ID>` `)` |

```l26
{
    set s;
    s = {};
    if (isempty(s))
        write 1;
    else
        write 0;
}
```

**期望输出**：
```
1
```

---

### 测试 18：`union` / `inter`

| 覆盖规则 |
|---|
| `<set_expr>` → `<ID>` `union` `<ID>` |
| `<set_expr>` → `<ID>` `inter` `<ID>` |

```l26
{
    set a;
    set b;
    set u;
    set t;
    a = {1, 2, 3};
    b = {3, 4};
    u = a union b;
    t = a inter b;
    write u;
    write t;
}
```

**期望输出**：
```
{1, 2, 3, 4}
{3}
```

---

### 测试 19：通过赋值使用 `union`（`<expr>` → `<set_expr>`）

| 覆盖规则 |
|---|
| `<assign_stmt>` 右值为 `<set_expr>` |

```l26
{
    set s1;
    set s2;
    set s3;
    s1 = {1, 5};
    s2 = {5, 9};
    s3 = s1 union s2;
    write s3;
}
```

**期望输出**：
```
{1, 5, 9}
```

---

## Level 8 · 综合样例

### 测试 20：README 示例 1

| 覆盖规则 |
|---|
| 声明、`read`、`if`+`in`、`add`、`while`、`write` 综合 |

```l26
{
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
}
```

**read 输入**：
```
2
```

**期望输出**：
```
2
1
0
999
```

---

### 测试 21：README 示例 2（作用域遮蔽）

| 覆盖规则 |
|---|
| 嵌套块、同名变量遮蔽、外层变量恢复 |

```l26
{
    int x;
    set s;
    x = 10;
    s = {1,2};
    {
        set x;
        x = {5,6};
        add x 7;
        write x;
        write s;
    }
    write x;
}
```

**期望输出**：
```
{5, 6, 7}
{1, 2}
10
```

---

### 测试 22：全规则混合回归

| 覆盖规则 |
|---|
| 全部语句类型与三类 `<expr>` 的混合使用 |

```l26
{
    int i;
    int sum;
    set odds;
    set evens;
    set allnums;
    bool flag;

    i = 1;
    sum = 0;
    odds = {};
    evens = {};
    flag = false;

    while (i <= 6) {
        sum = sum + i;
        if ((i / 2) * 2 == i) {
            add evens i;
        } else {
            add odds i;
        }
        i = i + 1;
    }

    allnums = odds union evens;

    if ((3 in allnums) && !(isempty(odds)) || false) {
        write sum;
        write allnums;
        write flag;
    }
}
```

**期望输出**：
```
21
{1, 2, 3, 4, 5, 6}
0
```

---

## 文法覆盖总表

| 产生式 | 用例编号 |
|---|---|
| `<program>` | 1–22 |
| `<block>` | 1–22 |
| `<decls>` 空 / 非空 | 1 / 3–22 |
| `<decl>` | 3–22 |
| `int` / `bool` / `set` | 3 / 4 / 5 |
| `<stmts>` 空 / 非空 | 1 / 2–22 |
| `<assign_stmt>` | 3–22 |
| `<if_stmt>` 无 else | 11, 16, 20, 22 |
| `<if_stmt>` 有 else | 12, 17, 22 |
| `<while_stmt>` | 13, 20, 22 |
| `write` `<expr>` | 2–22 |
| `read` `<ID>` | 10, 20 |
| `<stmt>` → `<block>` | 14, 21 |
| `add` / `remove` | 15, 20, 21, 22 |
| `<aexpr>` / `<aterm>` / `<afactor>` | 6, 10, 15, 20, 22 |
| `<bexpr>` / `<bterm>` / `<bfactor>` | 8, 9, 11–13, 16–17, 20, 22 |
| `<rel>` 六种运算符 | 7, 13, 20, 22 |
| `<set_literal>` 空 / 非空 | 5, 15, 18–22 |
| `union` / `inter` | 18, 19, 22 |
| `in` / `isempty` | 16, 17, 20, 22 |
| `<expr>` → `<aexpr>` | 3, 6, 10 |
| `<expr>` → `<bexpr>` | 4, 8, 9 |
| `<expr>` → `<set_expr>` | 5, 18, 19 |
| 词法注释 | 2 |

---

## 非法输入测试（应当报错）

用于 **语法检查**，每段独立测试，期望解析失败。

### 错例 1：声明缺少分号

```l26
{
    int x
    x = 1;
    write x;
}
```

### 错例 2：赋值缺少 `=`

```l26
{
    int x;
    x 1;
    write x;
}
```

### 错例 3：`if` 括号不匹配

```l26
{
    int x;
    if (x < 2 {
        write x;
    }
}
```

### 错例 4：语句缺少分号

```l26
{
    int x;
    while (x > 0)
        x = x - 1
}
```

### 错例 5：关系运算缺右操作数

```l26
{
    int x;
    if (x > ) {
        write x;
    }
}
```

### 错例 6：集合字面量缺逗号

```l26
{
    set s;
    s = {1 2,3};
    write s;
}
```

### 错例 7：`add` 缺集合名

```l26
{
    set s;
    add 3;
    write s;
}
```

### 错例 8：`isempty` 括号不匹配

```l26
{
    set s;
    if (isempty(s) {
        write 1;
    }
}
```

### 错例 9：块未闭合

```l26
{
    int x;
    write x;
```

### 错例 10：非法字符

```l26
{
    int x;
    x = 1 @ 2;
    write x;
}
```

---

## 使用说明

1. 在 `Final_Term/web` 运行 `node server.js`，访问 `http://localhost:4399`
2. 先点击 **编译解析器**，再将用例粘贴到编辑区
3. 含 `read` 的用例，在 **read 输入** 框按顺序填写整数（每行一个）
4. 点击 **运行程序** 对照 **期望输出**；非法用例点击 **语法检查** 验证报错
