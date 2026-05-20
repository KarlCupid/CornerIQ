import { useCallback, useMemo, useState } from "react";
import type { CornerSupabaseClient } from "../services/supabase/client";
import { deleteUserOwnedData, previewUserOwnedDataExport, type UserOwnedDataExportPreview } from "../services/supabase/userDataService";

export interface UserDataControlsHook {
  busy: boolean;
  deleteConfirmation: string;
  deleteData: () => Promise<void>;
  message: string | null;
  preview: UserOwnedDataExportPreview | null;
  previewExport: () => Promise<void>;
  previewRows: readonly string[];
  setDeleteConfirmation: (value: string) => void;
}

export function useUserDataControls(input: {
  client: CornerSupabaseClient;
  onAfterDelete: () => Promise<void>;
  userId: string;
}): UserDataControlsHook {
  const [busy, setBusy] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<UserOwnedDataExportPreview | null>(null);

  const previewExport = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const next = await previewUserOwnedDataExport(input.userId, input.client);
      setPreview(next);
      setMessage("Export preview loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export preview failed.");
    } finally {
      setBusy(false);
    }
  }, [input.client, input.userId]);

  const deleteData = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      await deleteUserOwnedData(input.userId, input.client, deleteConfirmation);
      setPreview(null);
      setDeleteConfirmation("");
      setMessage("User-owned data deleted.");
      await input.onAfterDelete();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }, [deleteConfirmation, input]);

  const previewRows = useMemo(() => (preview ? Object.entries(preview).map(([table, count]) => `${table}: ${count}`) : []), [preview]);

  return {
    busy,
    deleteConfirmation,
    deleteData,
    message,
    preview,
    previewExport,
    previewRows,
    setDeleteConfirmation
  };
}
