#!/usr/bin/env python3
"""
把 Supabase PostgreSQL dump 的 public schema 資料,
轉成 Cloudflare D1 (SQLite) 可以直接 import 的 seed SQL。

- COPY ... FROM stdin 區塊:tab-separated, 每列一筆; 欄位內的 \\t \\n \\r \\\\ 要 unescape; \\N = NULL
- timestamptz 保留成 ISO 字串 (SQLite 沒 native timestamptz,text 最穩)
- boolean f/t -> 0/1
- text[] ({a,b,c})    -> JSON array 字串
- jsonb          -> JSON 字串(已經是 JSON,原樣保留)
"""

import re
import json
import sys
from pathlib import Path

DUMP_PATH = Path("/mnt/user-data/uploads/bolt_database_backup.sql")
OUTPUT_SEED = Path("/home/claude/work/out/seed.sql")

# 表結構定義(欄位名 -> 型別) 按 COPY 行出現的順序
TABLE_SCHEMA = {
    "admins": {
        "columns": ["id", "email", "created_at"],
        "types":   ["text", "text", "text"],
    },
    "advanced_reading_unlocks": {
        "columns": ["id", "email", "reading_type", "unlocked_at", "card_data", "created_at"],
        "types":   ["text", "text", "text", "text", "json", "text"],
    },
    "conversion_events": {
        "columns": ["id", "email", "user_id", "event_type", "event_data", "created_at"],
        "types":   ["text", "text", "text", "text", "json", "text"],
    },
    "email_leads": {
        "columns": ["id", "email", "source", "created_at", "converted_to_user", "user_id"],
        "types":   ["text", "text", "text", "text", "bool", "text"],
    },
    "emails": {
        "columns": ["id", "email", "created_at", "source"],
        "types":   ["text", "text", "text", "text"],
    },
    "events": {
        "columns": ["id", "user_id", "event_type", "created_at", "meta"],
        "types":   ["text", "text", "text", "text", "json"],
    },
    "leads": {
        "columns": ["id", "email", "source", "created_at", "status"],
        "types":   ["text", "text", "text", "text", "text"],
    },
    "profiles": {
        "columns": ["id", "email", "created_at", "updated_at", "age", "gender", "occupation", "healing_interest", "purchased_spreads"],
        "types":   ["text", "text", "text", "text", "int", "text", "text", "text", "textarr"],
    },
    "reading_unlocks": {
        "columns": ["id", "email", "reading_type", "card_data", "unlocked_at"],
        "types":   ["text", "text", "text", "json", "text"],
    },
}


def pg_copy_unescape(field: str) -> str:
    """COPY 格式的 backslash escape 還原"""
    # \N 要在外層判斷,這裡專處理一般字面
    result = []
    i = 0
    while i < len(field):
        ch = field[i]
        if ch == "\\" and i + 1 < len(field):
            nxt = field[i + 1]
            if   nxt == "t":  result.append("\t")
            elif nxt == "n":  result.append("\n")
            elif nxt == "r":  result.append("\r")
            elif nxt == "b":  result.append("\b")
            elif nxt == "f":  result.append("\f")
            elif nxt == "v":  result.append("\v")
            elif nxt == "\\": result.append("\\")
            else:             result.append(nxt)
            i += 2
        else:
            result.append(ch)
            i += 1
    return "".join(result)


def sqlite_quote(s: str) -> str:
    """SQLite 字串字面:單引號 escape 成兩個單引號"""
    return "'" + s.replace("'", "''") + "'"


def convert_value(raw: str, pg_type: str):
    """把 dump 裡的單一欄位轉成 SQLite SQL literal"""
    if raw == "\\N":
        return "NULL"

    val = pg_copy_unescape(raw)

    if pg_type == "text":
        return sqlite_quote(val)

    if pg_type == "int":
        if val == "":
            return "NULL"
        return str(int(val))

    if pg_type == "bool":
        # PG dump 的 boolean 是 t / f
        if val in ("t", "true", "1"):
            return "1"
        if val in ("f", "false", "0"):
            return "0"
        return "NULL"

    if pg_type == "json":
        # 已是合法 JSON 字串;原樣存成 TEXT
        # 驗證一下以便早期失敗
        try:
            json.loads(val)
        except Exception as e:
            print(f"[warn] bad json value, storing as-is: {e}", file=sys.stderr)
        return sqlite_quote(val)

    if pg_type == "textarr":
        # PG text[] 字面格式:{a,b,c} 或 {} ; 元素無雙引號時不含逗號/空白
        # 穩健的做法:若兩側是 { },手動解析
        arr = parse_pg_array(val)
        return sqlite_quote(json.dumps(arr, ensure_ascii=False))

    raise ValueError(f"unknown pg_type: {pg_type}")


def parse_pg_array(s: str):
    """解析 PG 的 text[] literal,如 {a,b,"c,d"}"""
    if not s.startswith("{") or not s.endswith("}"):
        return []
    inner = s[1:-1]
    if inner == "":
        return []
    result = []
    i = 0
    cur = []
    in_q = False
    while i < len(inner):
        ch = inner[i]
        if in_q:
            if ch == "\\" and i + 1 < len(inner):
                cur.append(inner[i + 1])
                i += 2
                continue
            if ch == '"':
                in_q = False
                i += 1
                continue
            cur.append(ch)
            i += 1
        else:
            if ch == '"':
                in_q = True
                i += 1
                continue
            if ch == ",":
                result.append("".join(cur))
                cur = []
                i += 1
                continue
            cur.append(ch)
            i += 1
    result.append("".join(cur))
    return result


def main():
    OUTPUT_SEED.parent.mkdir(parents=True, exist_ok=True)
    raw_text = DUMP_PATH.read_text(encoding="utf-8")
    lines = raw_text.splitlines()

    out_sections = []
    stats = {}

    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^COPY public\.(\w+) \(([^)]+)\) FROM stdin;$", line)
        if not m:
            i += 1
            continue
        table = m.group(1)
        cols_in_dump = [c.strip() for c in m.group(2).split(",")]

        if table not in TABLE_SCHEMA:
            # 可能是我們沒定義的(例如不屬於 app 的),跳過
            i += 1
            continue

        schema = TABLE_SCHEMA[table]
        assert cols_in_dump == schema["columns"], (
            f"column order mismatch on {table}: dump={cols_in_dump} schema={schema['columns']}"
        )

        # 收集資料行,直到遇到 \.
        i += 1
        rows = []
        while i < len(lines) and lines[i] != "\\.":
            raw_line = lines[i]
            fields = raw_line.split("\t")
            assert len(fields) == len(schema["columns"]), (
                f"table {table} row has {len(fields)} fields, expected {len(schema['columns'])}\n"
                f"row: {raw_line!r}"
            )
            values = [
                convert_value(fields[k], schema["types"][k])
                for k in range(len(fields))
            ]
            rows.append(values)
            i += 1
        # 跳過 \.
        i += 1

        stats[table] = len(rows)

        if not rows:
            out_sections.append(f"-- {table}: 0 rows\n")
            continue

        col_list = ", ".join(schema["columns"])
        lines_out = [f"-- {table}: {len(rows)} rows"]
        # 每一筆一個 INSERT,方便錯誤定位;D1 有 100k statements/file 限制,這些量遠遠低於
        for values in rows:
            lines_out.append(
                f"INSERT INTO {table} ({col_list}) VALUES ({', '.join(values)});"
            )
        out_sections.append("\n".join(lines_out) + "\n")

    header = (
        "-- Seed data for Cloudflare D1, converted from Supabase pg_dump\n"
        "-- Run AFTER schema.sql:\n"
        "--   wrangler d1 execute <DB_NAME> --file=./migrations/schema.sql\n"
        "--   wrangler d1 execute <DB_NAME> --file=./migrations/seed.sql\n"
        "\n"
        "BEGIN TRANSACTION;\n\n"
    )
    footer = "\nCOMMIT;\n"

    OUTPUT_SEED.write_text(header + "\n".join(out_sections) + footer, encoding="utf-8")

    print("=== row counts ===")
    for t, n in stats.items():
        print(f"  {t:30s} {n:5d}")
    print(f"\nwrote -> {OUTPUT_SEED}")


if __name__ == "__main__":
    main()
