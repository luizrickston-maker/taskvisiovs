import subprocess

user_id = '067f253a-441c-4fca-920b-52036ef97eb9'

# Get all base tables with user_id column
cmd = ["psql", "-t", "-c", """
    SELECT c.table_name 
    FROM information_schema.columns c
    JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
    WHERE c.table_schema = 'public' 
    AND c.column_name = 'user_id'
    AND t.table_type = 'BASE TABLE';
"""]
result = subprocess.run(cmd, capture_output=True, text=True)
tables = [t.strip() for t in result.stdout.split('\n') if t.strip()]

delete_queries = [f"DELETE FROM public.{t} WHERE user_id = '{user_id}';" for t in set(tables)]

# Run the queries
for q in delete_queries:
    subprocess.run(["psql", "-c", q])

# Now delete from auth.users (if allowed via psql)
subprocess.run(["psql", "-c", f"DELETE FROM auth.users WHERE id = '{user_id}';"])
