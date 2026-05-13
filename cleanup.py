import subprocess
import json

user_id = '067f253a-441c-4fca-920b-52036ef97eb9'

# Get all tables with user_id column
cmd = ["psql", "-t", "-c", "SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'user_id';"]
result = subprocess.run(cmd, capture_output=True, text=True)
tables = [t.strip() for t in result.stdout.split('\n') if t.strip()]

delete_queries = []
for table in tables:
    # Check if table is a view (views can't be deleted from directly sometimes, but let's try or filter them)
    # Actually, psql -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" would be better
    delete_queries.append(f"DELETE FROM public.{table} WHERE user_id = '{user_id}';")

# Print queries for inspection or run them
# We should also check for tables where the user might be an owner via other columns if found earlier
# but user_id is the primary one here.

# Combine all into one transaction
full_query = "BEGIN; " + " ".join(delete_queries) + " COMMIT;"
print(full_query)
