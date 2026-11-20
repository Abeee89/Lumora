"use client";

import { useCallback, useEffect, useState } from "react";

import { apiRequest, type ApiFailure } from "../api-client";
import { Button, ErrorPanel, Panel } from "../control";
import { formatLastActive } from "../format";
import { messageFor } from "../messages";

interface SignInRow {
  id: string;
  device: string;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
}

/** A-15 Security section: active sign-ins with per-row revoke and "Revoke all others". */
export function SignInList() {
  const [rows, setRows] = useState<SignInRow[] | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFailure(null);
    const result = await apiRequest<{ data: SignInRow[] }>("/api/app/auth/sign-ins", { method: "GET" });
    if (result.ok) {
      setRows(result.data.data);
      return;
    }
    setRows([]);
    setFailure(result.failure);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (id: string) => {
    setPendingId(id);
    const result = await apiRequest<unknown>(`/api/app/auth/sign-ins/${id}`, { method: "DELETE" });
    setPendingId(null);
    if (result.ok) {
      await load();
      return;
    }
    setFailure(result.failure);
  };

  const revokeOthers = async () => {
    setPendingId("others");
    const result = await apiRequest<unknown>("/api/app/auth/sign-ins/revoke-others", { method: "POST" });
    setPendingId(null);
    if (result.ok) {
      await load();
      return;
    }
    setFailure(result.failure);
  };

  if (failure !== null) {
    return (
      <ErrorPanel
        title="We could not load your sign-ins"
        body={messageFor(failure.code, failure.message)}
        requestId={failure.requestId}
        action={<Button onClick={() => void load()}>Retry</Button>}
      />
    );
  }

  if (rows === null) {
    return (
      <div aria-busy="true" className="space-y-2">
        <p className="sr-only" role="status">
          Loading sign-ins
        </p>
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="h-12 rounded-card border border-line bg-sunken" />
        ))}
      </div>
    );
  }

  const others = rows.filter((row) => !row.current);

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id}>
            <Panel className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[15px] text-ink">
                  {row.device}
                  {row.current && (
                    <span className="ml-2 rounded-full border border-line-strong px-2 py-0.5 text-xs text-ink-2">
                      This device
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted">{formatLastActive(row.lastActiveAt)}</p>
              </div>
              {!row.current && (
                <Button
                  variant="secondary"
                  pending={pendingId === row.id}
                  onClick={() => void revoke(row.id)}
                >
                  Revoke
                </Button>
              )}
            </Panel>
          </li>
        ))}
      </ul>

      {others.length === 0 ? (
        <p className="text-sm text-muted">No other sign-ins</p>
      ) : (
        <Button variant="secondary" pending={pendingId === "others"} onClick={() => void revokeOthers()}>
          Revoke all others
        </Button>
      )}
    </div>
  );
}