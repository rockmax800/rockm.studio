
-- Seed provider data matching existing mock structure

INSERT INTO public.providers (id, name, code, status, base_url, supports_text, supports_streaming, supports_tools)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'OpenAI', 'openai', 'active', 'https://api.openai.com/v1', true, true, true),
  ('a0000000-0000-0000-0000-000000000002', 'Anthropic', 'anthropic', 'active', 'https://api.anthropic.com/v1', true, true, true);

INSERT INTO public.provider_models (id, provider_id, model_code, display_name, status, intended_use, max_context, supports_json, supports_streaming, supports_tool_use, cost_profile_hint, latency_profile_hint, quality_profile_hint)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'gpt-4o', 'GPT-4o', 'active', 'General agent execution, drafting, coordination', 128000, true, true, true, 'medium', 'medium', 'high'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'gpt-4o-mini', 'GPT-4o Mini', 'active', 'Lightweight tasks, summaries, classification', 128000, true, true, true, 'low', 'fast', 'standard'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'o1', 'o1', 'active', 'Complex reasoning, architecture analysis', 200000, true, false, false, 'high', 'slow', 'frontier'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'claude-sonnet-4-20250514', 'Claude Sonnet 4', 'active', 'Coding, implementation, review tasks', 200000, true, true, true, 'medium', 'medium', 'high'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'claude-opus-4-20250514', 'Claude Opus 4', 'active', 'Deep reasoning, architecture, long-form analysis', 200000, true, true, true, 'high', 'slow', 'frontier'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 'active', 'Fast classification, summaries, lightweight tasks', 200000, true, true, true, 'low', 'fast', 'standard');

INSERT INTO public.provider_credentials (provider_id, credential_label, secret_ref, status)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Production API Key', 'OPENAI_API_KEY', 'valid'),
  ('a0000000-0000-0000-0000-000000000002', 'Production API Key', 'ANTHROPIC_API_KEY', 'valid');

INSERT INTO public.routing_policies (policy_name, task_domain, role_code, preferred_provider_id, preferred_model_id, fallback_provider_id, fallback_model_id, allow_fallback, allow_cross_provider_retry, notes, status)
VALUES
  ('Founder Discussion', 'founder_control', 'product_strategist', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', true, true, 'Non-critical discussion, fallback safe', 'active'),
  ('Backend Implementation', 'backend', 'backend_implementer', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', null, null, false, false, 'Critical code work — no fallback without approval', 'active'),
  ('Code Review', 'review', 'reviewer', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000005', null, null, false, false, 'Review quality depends on model — no silent switch', 'active'),
  ('Product Drafting', 'docs', 'product_strategist', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', true, true, 'Drafting is safe for fallback', 'active'),
  ('Architecture Analysis', 'backend', 'solution_architect', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', true, false, 'Fallback to o1 acceptable for reasoning tasks', 'active'),
  ('Release Summary', 'release', 'release_coordinator', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', null, null, false, false, 'Low-cost summarization', 'active');
