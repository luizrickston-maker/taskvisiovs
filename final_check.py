import subprocess

user_id = '067f253a-441c-4fca-920b-52036ef97eb9'

# Get all base tables
cmd = ["psql", "-t", "-c", "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"]
result = subprocess.run(cmd, capture_output=True, text=True)
tables = [t.strip() for t in result.stdout.split('\n') if t.strip()]

for table in tables:
    # Check if table has any column with this value
    # We can use a query that checks all columns
    query = f"SELECT count(*) FROM public.{table} WHERE "
    
    # Get columns for this table
    cmd_cols = ["psql", "-t", "-c", f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND table_schema = 'public' AND data_type = 'uuid';"]
    res_cols = subprocess.run(cmd_cols, capture_output=True, text=True)
    cols = [c.strip() for c in res_cols.stdout.split('\n') if c.strip()]
    
    if not cols:
        continue
        
    where_clause = " OR ".join([f"\"{c}\" = '{user_id}'" for c in cols])
    full_query = query + where_clause
    
    res_count = subprocess.run(["psql", "-t", "-c", full_query], capture_output=True, text=True)
    count = res_count.stdout.strip()
    if count and count != '0' and not count.startswith('ERROR'):
        print(f"Table {table} still has {count} records for this user.")
