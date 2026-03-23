# 18 — Model Provider Architecture V1

## 1 — Purpose

This document defines how AI Workshop OS integrates model providers in V1.

The system must support multiple providers without making any single provider the source of truth for workflow or product behavior.

The goal is to:

- connect multiple model providers

- route tasks to the right provider/model

- track usage and health

- keep provider credentials outside frontend logic

- allow future provider expansion

- avoid coupling the product to one vendor

---

## 2 — V1 Provider Strategy

V1 will support a multi-provider architecture.

Initial provider targets:

- OpenAI

- Anthropic

Possible later additions:

- Google

- xAI

- Together

- Fireworks

- self-hosted or proxy endpoints

The product must remain provider-agnostic at the workflow level.

---

## 3 — Core Principle

Projects, tasks, runs, reviews, approvals, and artifacts belong to AI Workshop OS.

Providers only supply model execution.

This means:

- provider state must not replace task state

- provider response must not equal approval

- provider output must remain an artifact, not truth

- provider failure must not corrupt workflow state

---

## 4 — Provider Layer Responsibilities

The provider layer owns:

- provider configuration

- API credential lookup

- model registry

- model capability metadata

- task-to-model routing

- health checks

- usage capture

- cost estimation

- fallback logic where allowed

The provider layer does not own:

- project workflow

- task lifecycle

- reviews

- approvals

- canonical documentation

---

## 5 — Initial Providers

## 5.1 OpenAI

Use for:

- founder discussion flows

- structured writing tasks

- product and architecture drafting

- general agent execution

- possibly lightweight coordination roles

## 5.2 Anthropic

Use for:

- coding-heavy tasks

- long-form implementation reasoning

- review tasks

- architecture analysis

- backend implementation and validation tasks

These defaults are routing heuristics, not hard law.

Routing policy must remain editable.

---

## 6 — Provider Objects

V1 should represent providers through these logical objects:

- Provider

- ProviderModel

- ProviderCredential

- ProviderUsageSnapshot

- ProviderHealthCheck

- RoutingPolicy

These may initially be implemented as DB tables or partly as config + DB.

---

## 7 — Provider

Represents one external AI provider.

Fields:

- id

- name

- code

- status

- base_url optional

- supports_text

- supports_vision later

- supports_audio later

- supports_streaming

- supports_tools if relevant

- created_at

- updated_at

Initial provider codes:

- openai

- anthropic

---

## 8 — ProviderModel

Represents one model or named execution target.

Fields:

- id

- provider_id

- model_code

- display_name

- status

- intended_use

- max_context_known optional

- supports_json optional

- supports_streaming optional

- supports_tool_use optional

- cost_profile_hint optional

- latency_profile_hint optional

- quality_profile_hint optional

- created_at

- updated_at

Important:

This table is operational metadata, not a promise that all values are exact forever.

---

## 9 — ProviderCredential

Represents a credential reference for a provider.

Fields:

- id

- provider_id

- credential_label

- secret_ref

- status

- last_validated_at

- last_error

- created_at

- updated_at

Rules:

- raw keys must not be stored in plaintext in business tables

- secrets should live in environment variables or secret storage

- the UI may show status and label, not the key itself

---

## 10 — RoutingPolicy

Defines which provider/model is preferred for which work type.

Fields:

- id

- policy_name

- task_domain

- role_code

- requested_outcome optional

- preferred_provider_id

- preferred_model_id

- fallback_provider_id optional

- fallback_model_id optional

- allow_fallback boolean

- allow_cross_provider_retry boolean

- notes

- status

Examples:

- founder discussion → openai primary

- backend implementation → anthropic primary

- review → anthropic primary

- product drafting → openai primary

- release summary → openai primary

---

## 11 — Provider Health Model

The system should track for each provider:

- configured or not

- reachable or not

- last successful request

- last failed request

- recent error rate

- rate-limit warning state if observable

Possible health statuses:

- healthy

- degraded

- unavailable

- misconfigured

---

## 12 — Usage and Cost Visibility

The founder UI should show:

- requests count

- token usage if available

- estimated cost

- provider status

- last sync time

- warning if usage data is incomplete

Important:

The UI should present this as operational visibility, not billing truth.

Why:

different providers expose cost and usage data differently.

For Anthropic, the official Usage & Cost Admin API provides programmatic historical usage and cost data for organizations, but it requires an Admin API key and is unavailable for individual accounts.

For OpenAI, project API keys are managed at the project level, and usage/rate limits are surfaced at the organization/project level in account settings; rate limits apply at the organization and project level, not the user level.

V1 decision:

- store internal request logs and cost estimates ourselves

- later augment with official provider usage APIs where feasible

---

## 13 — Cost Tracking Strategy

V1 cost tracking has two layers:

### Layer A — Internal estimates

For every request store:

- provider

- model

- task

- run

- prompt/input token usage if available

- output token usage if available

- estimated cost

- timestamp

### Layer B — Provider reconciliation later

Where provider APIs allow it:

- pull official usage/cost summaries

- compare against internal estimates

- surface discrepancy if meaningful

This is especially relevant for Anthropic org usage if the account supports the Admin API.

---

## 14 — Key Management Policy

The founder does not top up provider balances from AI Workshop OS.

Instead:

- keys are configured externally

- provider billing remains in provider consoles

- the system only validates connectivity and usage signals

- if limits are hit, founder resolves them in the provider account

This is a deliberate product choice.

---

## 15 — Provider Failure Rules

If a provider call fails, the system must not lose workflow integrity.

Allowed outcomes:

- run fails

- run retries

- task becomes blocked

- task escalates

- fallback provider is attempted if policy allows

Forbidden:

- silently switching provider on critical work without trace

- pretending completion after provider failure

- swallowing rate-limit or auth failures

---

## 16 — Fallback Policy

Fallback is allowed only when explicitly configured.

Safe fallback examples:

- founder brainstorming

- non-critical drafting

- summary generation

Unsafe fallback examples unless approved:

- backend code implementation

- schema generation

- final architecture decisions

- critical review verdicts

Reason:

provider change can materially change output quality and behavior.

---

## 17 — Provider Router Responsibilities

The router decides:

- which provider to call

- which model to call

- whether fallback is allowed

- what metadata to capture

- how to classify provider error

- how to log usage

The router does not decide:

- whether a task is approved

- whether architecture is accepted

- whether a project is done

---

## 18 — Founder UI Requirements for Provider Layer

The UI should include a Provider Control screen with:

### Provider list

- provider name

- status

- configured

- last health check

- last error

- active models count

### Provider detail

- available models

- current routing roles

- recent usage

- recent failures

- credential status

### Cost overview

- estimated spend by provider

- estimated spend by project

- estimated spend by role

- warning banners

### Policy panel

- which roles/tasks route where

- fallback enabled or disabled

- critical-task restrictions

---

## 19 — V1 Non-Goals

Do not build in V1:

- billing or balance top-up UI

- marketplace of providers

- autonomous provider tuning

- fully dynamic model benchmarking engine

- prompt version laboratory

- automatic provider switching for all tasks

---

## 20 — Integration Notes from External Sources

### Symphony influence

Use provider calls as part of execution runs, not as the workflow owner.

This follows the orchestration-first model where policy and run control belong to the system, not the model provider.

### Agent Skills influence

Provider routing must respect context discipline.

Do not send bloated, low-value context just because a provider has a large context window. This is an architectural adaptation inspired by context-engineering practice.

### Everything Claude Code influence

Use provider/model selection as an execution tactic inside verification and subagent workflows, not as the product's central UX. This is an adaptation of their operational patterns, not a direct integration.

---

## 21 — V1 Decision

AI Workshop OS V1 will:

- run as a self-hosted internal platform

- use Lovable only to bootstrap interface and documentation

- use its own backend and DB as the system of record

- support OpenAI and Anthropic as initial providers

- store internal usage logs and cost estimates

- show provider status and estimated spend in UI

- keep billing actions outside the platform
