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

# Remove duplicates
tables = list(set(tables))

delete_queries = [f"DELETE FROM public.{table} WHERE user_id = '{user_id}';" for table in tables]

# Also check for owner_id or created_by in base tables
cmd_other = ["psql", "-t", "-c", """
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
    WHERE c.table_schema = 'public' 
    AND (c.column_name = 'owner_id' OR c.column_name = 'created_by')
    AND t.table_type = 'BASE TABLE';
"""]
result_other = subprocess.run(cmd_other, capture_output=True, text=True)
for line in result_other.stdout.split('\n'):
    if '|' in line:
        table, col = [x.strip() for x in line.split('|')]
        delete_queries.append(f"DELETE FROM public.{table} WHERE {col} = '{user_id}';")

# Combine all into one transaction
# We'll also delete the user from auth.users at the end if possible, or advise.
# For now, let's run the public table cleanup.
full_query = "BEGIN; " + " ".join(delete_queries) + " COMMIT;"
print(full_query)
