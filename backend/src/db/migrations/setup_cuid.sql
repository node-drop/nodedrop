-- Create CUID function for PostgreSQL
CREATE OR REPLACE FUNCTION cuid() RETURNS text AS $$
DECLARE
  v_time bigint;
  v_random text;
  v_counter int;
BEGIN
  -- Get current timestamp in milliseconds
  v_time := (EXTRACT(EPOCH FROM now()) * 1000)::bigint;
  
  -- Generate random bytes and convert to base36-like string
  v_random := encode(gen_random_bytes(8), 'hex');
  
  -- Simple counter (in production, this should be more sophisticated)
  v_counter := (random() * 1000000)::int;
  
  -- Combine into a CUID-like format
  RETURN 'c' || to_hex(v_time) || v_random || to_hex(v_counter);
END;
$$ LANGUAGE plpgsql;
