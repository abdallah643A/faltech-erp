-- Add SQL Server connection support to existing sap_database_connections table
ALTER TABLE public.sap_database_connections
  ADD COLUMN IF NOT EXISTS connection_type TEXT NOT NULL DEFAULT 'service_layer',
  ADD COLUMN IF NOT EXISTS sql_host TEXT,
  ADD COLUMN IF NOT EXISTS sql_port INTEGER DEFAULT 1433,
  ADD COLUMN IF NOT EXISTS sql_database TEXT,
  ADD COLUMN IF NOT EXISTS sql_encrypt BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sql_trust_cert BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.sap_database_connections.connection_type IS 'service_layer or sql_server';
COMMENT ON COLUMN public.sap_database_connections.sql_host IS 'SQL Server hostname (only for sql_server type)';
COMMENT ON COLUMN public.sap_database_connections.sql_port IS 'SQL Server port (only for sql_server type, default 1433)';
COMMENT ON COLUMN public.sap_database_connections.sql_database IS 'SQL Server database name (only for sql_server type)';
COMMENT ON COLUMN public.sap_database_connections.sql_encrypt IS 'Enable SSL/TLS encryption (only for sql_server type)';
COMMENT ON COLUMN public.sap_database_connections.sql_trust_cert IS 'Trust server certificate (only for sql_server type)';