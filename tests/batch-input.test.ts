import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeBatchRows, applyBatchFieldSuggestion, createBatchExampleInput, parseBatchRows } from "../src/lib/batch-input";

test("parseBatchRows supports CSV headers mapped from labels", () => {
  const rows = parseBatchRows(
    [
      "Client Name,Project Name,Timeline",
      "Acme Inc.,Website Revamp,6 weeks",
      "Northstar Systems,Landing Page,3 weeks"
    ].join("\n"),
    "csv",
    [
      { key: "client_name", label: "Client Name" },
      { key: "project_name", label: "Project Name" },
      { key: "timeline", label: "Timeline" }
    ]
  );

  assert.deepEqual(rows, [
    {
      client_name: "Acme Inc.",
      project_name: "Website Revamp",
      timeline: "6 weeks"
    },
    {
      client_name: "Northstar Systems",
      project_name: "Landing Page",
      timeline: "3 weeks"
    }
  ]);
});

test("parseBatchRows supports TXT key-value blocks", () => {
  const rows = parseBatchRows(
    [
      "client_name: Acme Inc.",
      "project_name: Website Revamp",
      "scope: UX audit, redesign, implementation",
      "",
      "client_name: Northstar Systems",
      "project_name: Landing Page",
      "scope: Messaging refresh",
      "continued line"
    ].join("\n"),
    "txt"
  );

  assert.deepEqual(rows, [
    {
      client_name: "Acme Inc.",
      project_name: "Website Revamp",
      scope: "UX audit, redesign, implementation"
    },
    {
      client_name: "Northstar Systems",
      project_name: "Landing Page",
      scope: "Messaging refresh\ncontinued line"
    }
  ]);
});

test("analyzeBatchRows reports missing required fields with row context", () => {
  const analysis = analyzeBatchRows(
    [
      "client_name,project_name,timeline",
      "Acme Inc.,Website Revamp,6 weeks",
      "Northstar Systems,,3 weeks"
    ].join("\n"),
    "csv",
    [
      { key: "client_name", label: "Client Name", required: true },
      { key: "project_name", label: "Project Name", required: true },
      { key: "timeline", label: "Timeline", required: true }
    ]
  );

  assert.equal(analysis.rows.length, 2);
  assert.equal(analysis.issues.length, 1);
  assert.equal(analysis.issues[0]?.code, "missing_required_field");
  assert.match(analysis.issues[0]?.message || "", /row 2/i);
});

test("analyzeBatchRows reports JSON parse location", () => {
  const analysis = analyzeBatchRows(
    '[{"client_name":"Acme"}',
    "json",
    [{ key: "client_name", label: "Client Name", required: true }]
  );

  assert.equal(analysis.rows.length, 0);
  assert.equal(analysis.issues[0]?.code, "json_parse_error");
  assert.match(analysis.issues[0]?.message || "", /line 1, column/i);
});

test("analyzeBatchRows suggests the closest CSV header match", () => {
  const analysis = analyzeBatchRows(
    [
      "client,project_name,timeline",
      "Acme Inc.,Website Revamp,6 weeks"
    ].join("\n"),
    "csv",
    [
      { key: "client_name", label: "Client Name", required: true },
      { key: "project_name", label: "Project Name", required: true },
      { key: "timeline", label: "Timeline", required: true }
    ]
  );

  const issue = analysis.issues.find((candidate) => candidate.code === "csv_unknown_header");
  assert.ok(issue);
  assert.equal(issue?.suggestion, "client_name");
  assert.match(issue?.message || "", /did you mean "client_name"/i);
});

test("createBatchExampleInput generates a CSV sample using template fields", () => {
  const sample = createBatchExampleInput("csv", [
    { key: "client_name", label: "Client Name", required: true },
    { key: "project_name", label: "Project Name", required: true },
    { key: "timeline", label: "Timeline", required: true }
  ]);

  const lines = sample.split("\n");
  assert.equal(lines[0], "client_name,project_name,timeline");
  assert.equal(lines.length, 3);
});

test("applyBatchFieldSuggestion rewrites CSV headers that match the suggested field", () => {
  const updated = applyBatchFieldSuggestion(
    [
      "client,project_name,timeline",
      "Acme Inc.,Website Revamp,6 weeks"
    ].join("\n"),
    "csv",
    "client",
    "client_name"
  );

  assert.equal(updated.split("\n")[0], "client_name,project_name,timeline");
});

test("applyBatchFieldSuggestion rewrites TXT keys that match the suggested field", () => {
  const updated = applyBatchFieldSuggestion(
    [
      "client: Acme Inc.",
      "project_name: Website Revamp"
    ].join("\n"),
    "txt",
    "client",
    "client_name"
  );

  assert.match(updated, /^client_name: Acme Inc\./m);
});