import { useCallback, useMemo, useState } from "react";
import type { CornerSupabaseClient } from "../services/supabase/client";
import {
  deleteUserOwnedData,
  generateUserOwnedDataExportBundleString,
  groupUserOwnedPreviewCounts,
  previewUserOwnedDataExport,
  type UserOwnedDataExportPreview
} from "../services/supabase/userDataService";

export interface UserDataControlsHook {
  accountDeletionCopy: string;
  bundleText: string | null;
  busy: boolean;
  deleteConfirmation: string;
  deleteData: () => Promise<void>;
  generateExportBundle: () => Promise<void>;
  message: string | null;
  preview: UserOwnedDataExportPreview | null;
  previewExport: () => Promise<void>;
  portableExportRows: readonly string[];
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
  const [bundleText, setBundleText] = useState<string | null>(null);

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
      if (!preview) {
        setMessage("Preview export before deleting app data.");
        return;
      }
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
  }, [deleteConfirmation, input, preview]);

  const generateExportBundle = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const next = await generateUserOwnedDataExportBundleString(input.userId, input.client);
      setBundleText(next);
      setMessage("Portable JSON export bundle generated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export bundle failed.");
    } finally {
      setBusy(false);
    }
  }, [input.client, input.userId]);

  const previewRows = useMemo(() => (preview ? Object.entries(groupUserOwnedPreviewCounts(preview)).map(([category, count]) => `${category}: ${count}`) : []), [preview]);
  const portableExportRows = useMemo(
    () =>
      bundleText
        ? [
            `Portable JSON: ${bundleText.length} characters`,
            "Includes grouped user-owned rows and redacted user id hash.",
            "Copy or save this JSON with the platform tools available on this device."
          ]
        : [],
    [bundleText]
  );

  return {
    accountDeletionCopy:
      "Delete app data removes user-owned app rows only. Deleting the Supabase auth identity requires a trusted server-side function and is not claimed by this client.",
    bundleText,
    busy,
    deleteConfirmation,
    deleteData,
    generateExportBundle,
    message,
    portableExportRows,
    preview,
    previewExport,
    previewRows,
    setDeleteConfirmation
  };
}
