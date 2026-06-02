-- Tighten task-attachments listing: only authenticated users can list/query objects via storage API.
-- Public URLs continue to work because the public bucket serves files via /storage/v1/object/public/...
DROP POLICY IF EXISTS "Anyone can view task attachments" ON storage.objects;

CREATE POLICY "Authenticated users can view task attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'task-attachments');