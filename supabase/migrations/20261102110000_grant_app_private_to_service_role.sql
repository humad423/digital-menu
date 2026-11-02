-- The column guard triggers run for every role, so server-side updates need access too.
grant usage on schema app_private to service_role;
grant execute on all functions in schema app_private to service_role;
