"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { SettingsView } from "@/components/settings/SettingsView";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsPage() {
  const { institutionId } = useAppStore();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!institutionId) return null;

  return (
    <AppShell>
      <SettingsView
        key={refreshKey}
        institutionId={institutionId}
        onUpdate={() => setRefreshKey((k) => k + 1)}
      />
    </AppShell>
  );
}
