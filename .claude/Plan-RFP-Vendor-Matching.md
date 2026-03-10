# Plan: RFP Vendor Matching & Messaging

## Context
When a ticket's AI agent creates tasks for jobs that need vendor coverage, the user wants to send RFPs directly to matching GoHighLevel PROSPECT_VENDOR contacts. The system uses the LLM to classify each selected task's service type and location, queries GHL for matching vendors, picks the right channel (SMS preferred → email fallback), and sends individual or combined messages based on a new settings preference.

## Flow
1. User selects tasks in TaskList → clicks **Send RFP** in bulk action bar
2. Confirmation modal shows task count + "Matching vendors will be queried from GHL"
3. `POST /api/tickets/:id/tasks/rfp` with `{ taskIds[] }`
4. Backend: classify tasks → find vendors per service/location → resolve channel → send → note → mark 'sent'
5. Frontend shows results: "N messages sent to M vendors"

---

## Step 1 — Add `callLLM` to `backend/src/services/llmClient.ts`
Simple single-call helper (no tool loop):
```typescript
export async function callLLM(opts: {
  provider: AIProvider; model: string; apiKey: string;
  system: string; userMessage: string;
}): Promise<string>
```
Dispatches to Anthropic `messages.create`, OpenAI `chat.completions.create`, or Gemini `generateContent`. Returns plain text.

---

## Step 2 — Extend AIConfig in `backend/src/services/aiConfig.ts`
- Add `rfp_message_grouping: 'individual' | 'combined'` to `AIConfig` interface
- Update `DEFAULT` to include `rfp_message_grouping: 'individual'`
- No other changes needed — `loadAIConfig`/`saveAIConfig` handle the field automatically via JSON

---

## Step 3 — Create `backend/src/services/rfpService.ts` (NEW)

### `classifyTasks(tasks, aiConfig)` → `Array<{taskId, service_code, location}>`
One `callLLM` call with all task descriptions + businessConfig service codes + locations.
Asks LLM to return JSON array. Falls back gracefully if parsing fails.

### `findVendors(service_code, location, cfg)` → `GHLVendor[]`
Extracts the two-step GHL logic from `ghl.ts` test-query route:
1. `GET /locations/{id}/customFields` → find checkbox field ID for PROSPECT_VENDOR
2. `GET /contacts/?locationId=...` → filter by checkbox value + service tag + location tag
Returns contacts with `{ id, name, email, phone, dnd, dndSettings, communicationPreference }`.
In mock mode (`!hasGHLConfig()`): filters MOCK_GHL_CONTACTS instead.

### `resolveChannel(vendor)` → `'sms' | 'email' | null`
- `'sms'`: has phone AND `dndSettings.SMS?.status !== 'active'` AND `dndSettings.Call?.status !== 'active'`
- `'email'`: has email AND `dndSettings.Email?.status !== 'active'`
- `null`: skip

### `buildMessages(tasks, vendor, channel, grouping)` → `string[]`
- `individual`: one message string per task
- `combined`: one message string with all tasks listed
- SMS: plain text; Email: HTML

### `runRFP(ticketId, taskIds)` → `RFPResult`
Orchestrates: classify → group by (service_code, location) → findVendors → resolveChannel → buildMessages → sendMessage (reuses GHL call pattern from test-notify) → create Note on ticket → update task statuses to 'sent'.
Returns `{ sent: number, skipped: number, vendors: Array<{name, channel}> }`.

---

## Step 4 — New route in `backend/src/routes/tickets.ts`
```typescript
router.post('/api/tickets/:id/tasks/rfp', async (req, res) => {
  const { taskIds } = req.body as { taskIds: string[] };
  const result = await runRFP(req.params.id, taskIds);
  res.json({ ok: true, ...result });
});
```

---

## Step 5 — Settings route `backend/src/routes/settings.ts`
- `GET /api/settings/ai`: include `rfp_message_grouping` in response (already returned via `...loadAIConfig()`)
- `POST /api/settings/ai`: accept and forward `rfp_message_grouping` to `saveAIConfig`

---

## Step 6 — `frontend/src/pages/Settings.tsx` — AI Agent card
- Add `rfp_message_grouping: 'individual' | 'combined'` to `AISettings` interface
- Add a select/radio below the Model picker:
  - **Individual** (default): one message per job/visit per vendor
  - **Combined**: one message per vendor with all jobs listed
- Save via existing `saveAI` mutation (include new field in POST body)

---

## Step 7 — `frontend/src/components/TaskList.tsx` — Send RFP button
- Add `rfpModalOpen` state, replace `setModalType('rfp')` with `setRfpModalOpen(true)`
- Add `sendRFP` useMutation: `POST /api/tickets/:id/tasks/rfp` with `{ taskIds: [...selectedIds] }`
- Inline RFP confirmation modal:
  - Shows: selected task count + note about GHL vendor lookup
  - **Send RFP** button → calls mutation → loading state → results on success
  - Results display: "Sent N messages: [name] via SMS, [name] via email, ..."
  - On success: invalidate `['tasks', ticketId]` and `['notes', ticketId]`

---

## Critical Files

| File | Action |
|------|--------|
| `backend/src/services/llmClient.ts` | Add `callLLM` helper |
| `backend/src/services/aiConfig.ts` | Add `rfp_message_grouping` field |
| `backend/src/services/rfpService.ts` | CREATE |
| `backend/src/routes/tickets.ts` | Add `POST /:id/tasks/rfp` |
| `backend/src/routes/settings.ts` | Pass through `rfp_message_grouping` |
| `frontend/src/pages/Settings.tsx` | Add grouping selector |
| `frontend/src/components/TaskList.tsx` | Replace RFP bulk action with new modal |

---

## Verification
1. Create ticket: "Vendor Maria is sick, she covers Key West"
2. Run AI agent → tasks generated with service + location in descriptions
3. Select tasks → **Send RFP** → confirm
4. Backend logs: `[RFP] Classified X tasks`, `[RFP] Found N vendors for rc/key west fl`, `[RFP] Sent SMS to ...`
5. Ticket notes: "RFP sent to: [name] via SMS, [name] via email"
6. Tasks marked `sent`
7. Settings → change grouping to Combined → repeat → one message per vendor
