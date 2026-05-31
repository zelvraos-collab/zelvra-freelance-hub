REVOKE EXECUTE ON FUNCTION public.next_invoice_number(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(UUID) TO service_role;