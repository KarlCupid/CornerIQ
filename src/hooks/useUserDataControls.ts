import { useCallback, useMemo, useState } from "react";
import type { CornerSupabaseClient } from "../services/supabase/client";
import {
  ACCOUNT_DELETION_CONFIRMATION,
  APP_DATA_DELETION_CONFIRMATION,
  deleteUserOwnedData,
  deleteAccount,
  generateUserOwnedDataExportBundleString,
  groupUserOwnedPreviewCounts,
  previewUserOwnedDataExport,
  type UserOwnedDataExportPreview
} from "../services/supabase/userDataService";

export function normalizeDestructiveConfirmation(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function appDataDeleteConfirmationMatches(value: string): boolean {
  return normalizeDestructiveConfirmation(value) === APP_DATA_DELETION_CONFIRMATION;
}

export function accountDeleteConfirmationMatches(value: string): boolean {
  return normalizeDestructiveConfirmation(value) === ACCOUNT_DELETION_CONFIRMATION;
}

export interface UserDataControlsHook {
  accountDeleteConfirmation: string;
  accountDeletionResultRows: readonly string[];
  accountDeletionCopy: string;
  bundleText: string | null;
  busy: boolean;
  deleteConfirmation: string;
  deleteAccount: () => Promise<void>;
  deleteData: () => Promise<void>;
  generateExportBundle: () => Promise<void>;
  message: string | null;
  preview: UserOwnedDataExportPreview | null;
  previewExport: () => Promise<void>;
  portableExportRows: readonly string[];
  previewRows: readonly string[];
  setAccountDeleteConfirmation: (value: string) => void;
  setDeleteConfirmation: (value: string) => void;
}

export function useUserDataControls(input: {
  client: CornerSupabaseClient;
  onAfterDelete: () => Promise<void>;
  userId: string;
}): UserDataControlsHook {
  const [busy, setBusy] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [accountDeleteConfirmation, setAccountDeleteConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<UserOwnedDataExportPreview | null>(null);
  const [bundleText, setBundleText] = useState<string | null>(null);
  const [accountDeletionResultRows, setAccountDeletionResultRows] = useState<readonly string[]>([]);

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
      await deleteUserOwnedData(input.userId, input.client, normalizeDestructiveConfirmation(deleteConfirmation));
      setPreview(null);
      setBundleText(null);
      setDeleteConfirmation("");
      setMessage("User-owned data deleted.");
      await input.onAfterDelete();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }, [deleteConfirmation, input]);

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

  const deleteAccountAction = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await deleteAccount(input.userId, input.client, normalizeDestructiveConfirmation(accountDeleteConfirmation));
      const deletedCount = Object.values(result.appDataDeletion).reduce((sum, row) => sum + (row.count ?? 0), 0);
      setAccountDeletionResultRows([`Account deletion completed at ${result.deletedAt}.`, `Deleted app-data rows reported by server: ${deletedCount}.`, "Signing out of this device."]);
      setAccountDeleteConfirmation("");
      setMessage("Account deleted. Signing out.");
      await input.onAfterDelete();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Account deletion failed.");
    } finally {
      setBusy(false);
    }
  }, [accountDeleteConfirmation, input]);

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
    accountDeleteConfirmation,
    accountDeletionResultRows,
    accountDeletionCopy:
      "Delete app data removes user-owned app rows only. Delete account removes app data and deletes the sign-in identity through CornerIQ's trusted server-side account deletion function. Account deletion signs you out.",
    bundleText,
    busy,
    deleteConfirmation,
    deleteAccount: deleteAccountAction,
    deleteData,
    generateExportBundle,
    message,
    portableExportRows,
    preview,
    previewExport,
    previewRows,
    setAccountDeleteConfirmation,
    setDeleteConfirmation
  };
}
