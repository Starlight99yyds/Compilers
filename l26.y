%{
#include <stdio.h>
#include <stdlib.h>

int yylex(void);
void yyerror(const char *msg);
extern int yylineno;
%}

%error-verbose

%token ID NUM
%token INT BOOL SET
%token IF ELSE WHILE
%token WRITE READ
%token ADD REMOVE
%token TRUE FALSE
%token UNION INTER IN ISEMPTY
%token OR AND
%token LE GE EQ NE

%start program

%nonassoc LOWER_THAN_ELSE
%nonassoc ELSE

%%

program
    : block
    ;

block
    : '{' decls stmts '}'
    ;

decls
    : /* empty */
    | decls decl
    ;

decl
    : type ID ';'
    ;

type
    : INT
    | BOOL
    | SET
    ;

stmts
    : /* empty */
    | stmts stmt
    ;

stmt
    : assign_stmt
    | if_stmt
    | while_stmt
    | io_stmt
    | block
    | set_op_stmt
    ;

assign_stmt
    : ID '=' expr ';'
    ;

if_stmt
    : IF '(' bexpr ')' stmt %prec LOWER_THAN_ELSE
    | IF '(' bexpr ')' stmt ELSE stmt
    ;

while_stmt
    : WHILE '(' bexpr ')' stmt
    ;

io_stmt
    : WRITE expr ';'
    | READ ID ';'
    ;

set_op_stmt
    : ADD ID aexpr ';'
    | REMOVE ID aexpr ';'
    ;

expr
    : bexpr
    | aexpr
    | set_expr
    ;

aexpr
    : aexpr '+' aterm
    | aexpr '-' aterm
    | aterm
    ;

aterm
    : aterm '*' afactor
    | aterm '/' afactor
    | afactor
    ;

afactor
    : ID
    | NUM
    | '(' aexpr ')'
    ;

bexpr
    : bexpr OR bterm
    | bterm
    ;

bterm
    : bterm AND bfactor
    | bfactor
    ;

bfactor
    : TRUE
    | FALSE
    | '!' bfactor
    | '(' bexpr ')'
    | rel
    | set_test
    ;

rel
    : aexpr '<' aexpr
    | aexpr LE aexpr
    | aexpr '>' aexpr
    | aexpr GE aexpr
    | aexpr EQ aexpr
    | aexpr NE aexpr
    ;

set_expr
    : set_literal
    | ID UNION ID
    | ID INTER ID
    ;

set_literal
    : '{' opt_aexpr_list '}'
    ;

opt_aexpr_list
    : /* empty */
    | aexpr_list
    ;

aexpr_list
    : aexpr
    | aexpr_list ',' aexpr
    ;

set_test
    : aexpr IN ID
    | ISEMPTY '(' ID ')'
    ;

%%

int main(void)
{
    int ret = yyparse();
    if (ret == 0) {
        printf("Parse succeeded.\n");
    }
    return ret;
}

void yyerror(const char *msg)
{
    fprintf(stderr, "Syntax error at line %d: %s\n", yylineno, msg);
}
