import sqlite3, os, sys

DB = os.path.join(os.path.dirname(__file__), '..', 'backend', 'dev.db')

def main():
    if not os.path.exists(DB):
        print("db_not_found", DB)
        return
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, email, hashed_password FROM users")
    except Exception as e:
        print("query_error", e)
        return
    rows = cur.fetchall()
    if not rows:
        print("no_users")
        return
    for r in rows:
        print("id:", r[0])
        print("email:", r[1])
        print("hashed:", r[2][:120])
        print("---")

if __name__ == '__main__':
    main()


