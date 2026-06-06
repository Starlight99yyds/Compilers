### 2026年《编译原理与实践》大作业要求

下面是用EBNF描述的L26语言，使用到的EBNF元符号含义同教材P13，所有的终结符用双引号括起表示。

```
<program> ::= <block>
<block>  ::= "{" <decls> <stmts> "}"
<decls>  ::= { <decl> }
<decl>   ::= <type> <ID> ";"
<type>   ::= "int" | "bool" | "set" （*set采用静态实现，最大支持200个集合元素*）

<stmts>  ::= { <stmt> }
<stmt>   ::= <assign_stmt>
           | <if_stmt>
           | <while_stmt>
           | <io_stmt>
           | <block>
           | <set_op_stmt>（*集合操作语句*）

<assign_stmt> ::= <ID> "=" <expr> ";"
<if_stmt>     ::= "if" "(" <bexpr> ")" <stmt> [ "else" <stmt> ]
<while_stmt>  ::= "while" "(" <bexpr> ")" <stmt>
<io_stmt>     ::= "write" <expr> ";" | "read" <ID> ";"
<set_op_stmt> ::= "add" <ID> <aexpr> ";"   （*向集合添加元素，注意不能破坏集合元素互异唯一性，元素的顺序不影响集合*）
                | "remove" <ID> <aexpr> ";"（*从集合删除元素，如果不存在该元素，操作后不改变原集合*）

<expr> ::= <bexpr> | <aexpr> | <set_expr>

（*算术表达式*）
<aexpr> ::= <aterm> { ("+" | "-") <aterm> }
<aterm> ::= <afactor> { ("*" | "/") <afactor> }
<afactor> ::= <ID> | NUM | "(" <aexpr> ")"

（*逻辑表达式*）
<bexpr> ::= <bterm> { "||" <bterm> }
<bterm> ::= <bfactor> { "&&" <bfactor> }
<bfactor> ::= "true" | "false" | "!" <bfactor> | "(" <bexpr> ")" | <rel> | <set_test>

（*关系运算*）
<rel> ::= <aexpr> ("<" | "<=" | ">" | ">=" | "==" | "!=") <aexpr>

（*SET集合相关文法*）
<set_expr> ::= "{" [ <aexpr> { "," <aexpr> } ] "}"（*集合字面量：{1, 2, 3}*）
             | <ID> "union" <ID> （*并集*）
             | <ID> "inter" <ID> （*交集*）
<set_test> ::= <aexpr> "in" <ID> （*成员检查*）
             | "isempty" "(" <ID> ")" （*空集检查*）
```

#### 示例代码1：
```
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

#### 示例代码2：
```
{
    int x;
    set s;
    x = 10;
    s = {1,2};
    {
        set x; // 合法：遮蔽了外层的 int x 
        x = {5,6};  // 此时 x 是集合
        add x 7;
        write x;  // 输出 {5, 6, 7}
        write s; // 合法：内层没声明 s，向上找到外层的 s
    }
    write x;  // 输出 10：内层作用域已销毁，x 恢复为 int
}
```

---

### 作业要求：

1. 每位同学对（扩展后的）L26语言编写编译器，生成类P-Code指令规范，可在类P-Code虚拟机上运行（可根据需要增加指令和修改虚拟机）。
2. 用该语言编写至少三个有逻辑功能的程序，编译并运行得到正确结果。
3. 文档及程序不能抄袭。鼓励交流讨论，但禁止抄袭。

---

### 作业提交：

提交到FTP服务器，分为三个子目录：**文档**、**程序**、**测试**。

- **文档**：包括编译器设计说明、运行方式、扩展后文法定义、代码结构、测试结果截图等。
- **程序**：包含源程序和可执行程序。
- **测试**：包含测试用例。

---

### 评分规则：

#### 基础分（80分）：
- 文档、程序、测试用例齐全，有基本的输入输出用户界面。

#### 加分项（最多20分，加到100分为止）：
- 能显示生成的pcode，支持内存管理演示、单步运行（最多10分）
- 能判定两个集合是否相等（最多10分）
- 支持集合推导式，如：
  ```
  s2 = { x+1 | x in s1 if x > 2 };
  ```
  （最多15分）
