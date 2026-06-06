%{
#include <stdio.h>
#include <ctype.h>
#include "l26.tab.h"

void yyerror(const char *msg);
%}

%option noyywrap
%option yylineno
%option noinput
%option nounput

%x COMMENT

DIGIT   [0-9]
IDEN    [A-Za-z_][A-Za-z0-9_]*

%%

"int"               { return INT; }
"bool"              { return BOOL; }
"set"               { return SET; }
"if"                { return IF; }
"else"              { return ELSE; }
"while"             { return WHILE; }
"write"             { return WRITE; }
"read"              { return READ; }
"add"               { return ADD; }
"remove"            { return REMOVE; }
"true"              { return TRUE; }
"false"             { return FALSE; }
"union"             { return UNION; }
"inter"             { return INTER; }
"in"                { return IN; }
"isempty"           { return ISEMPTY; }

"||"                { return OR; }
"&&"                { return AND; }
"<="                { return LE; }
">="                { return GE; }
"=="                { return EQ; }
"!="                { return NE; }

"//"[^\r\n]*        { /* skip single-line comments */ }
"/*"                { BEGIN(COMMENT); }
<COMMENT>"*/"       { BEGIN(INITIAL); }
<COMMENT>\n         { /* keep yylineno updated */ }
<COMMENT>.          { /* skip block comment content */ }
<COMMENT><<EOF>>    { yyerror("块注释未闭合"); return 0; }

{DIGIT}+            { return NUM; }
{IDEN}              { return ID; }

[ \t\r\n]+          { /* skip whitespace */ }

"{"                 { return '{'; }
"}"                 { return '}'; }
"("                 { return '('; }
")"                 { return ')'; }
";"                 { return ';'; }
","                 { return ','; }
"="                 { return '='; }
"+"                 { return '+'; }
"-"                 { return '-'; }
"*"                 { return '*'; }
"/"                 { return '/'; }
"!"                 { return '!'; }
"<"                 { return '<'; }
">"                 { return '>'; }

.                   {
                        char buf[64];
                        unsigned char c = (unsigned char)yytext[0];
                        if (isprint(c)) {
                            snprintf(buf, sizeof(buf), "非法字符 '%c'", c);
                        } else {
                            snprintf(buf, sizeof(buf), "非法字符 (0x%02X)", c);
                        }
                        yyerror(buf);
                        return 0;
                    }

%%
