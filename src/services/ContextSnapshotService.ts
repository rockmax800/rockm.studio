/**
 * ContextSnapshotService — Freeze-and-hash assembly for reproducible Runs.
 *
 * When a Run enters `preparing`, this service:
 *   1. Resolves all included documents (with version or full content snapshot)
 *   2. Resolves all included artifacts (frozen content, not live references)
 *   3. Records prompt_version_ref and skill_pack_version_ref
 *   4. Builds context_manifest_json with everything frozen
 *   5. Computes context_hash = sha256(manifest)
 *   6. Stores assembled_at and assembled_by
 *
 * Invariant: Given Run + ContextPack, the exact context can always be reconstructed.
 * No business logic changes — this is a snapshot/audit layer only.
 */

import { logInfo, logError } from "@/lib/logger";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

export interface ContextManifest {
  /** ISO timestamp when manifest was assembled */
  assembled_at: string;
  /** Who triggered assembly */
  assembled_by: "system" | "founder" | string;
  /** Frozen document snapshots */
  documents: DocumentSnapshot[];
  /** Frozen artifact snapshots */
  artifacts: ArtifactSnapshot[];
  /** File paths included (informational) */
  file_paths: string[];
  /** Assumptions recorded at assembly time */
  assumptions: unknown[];
  /** Prompt version used for this run */
  prompt_version_ref: string | null;
  /** Skill pack version identifier */
  skill_pack_version_ref: string | null;
  /** Summary text at assembly time */
  summary: string | null;
  /** Missing context notes */
  missing_context_notes: string | null;
}

interface DocumentSnapshot {
  document_id: string;
  title: string;
  version_label: string | null;
  /** If version_label exists, we record it. Otherwise we snapshot full content. */
  content_snapshot: string | null;
  doc_type: string;
  status: string;
}

interface ArtifactSnapshot {
  artifact_id: string;
  title: string;
  artifact_type: string;
  version: number;
  state: string;
  content_snapshot: string | null;
  summary: string | null;
  storage_kind: string;
  file_path: string | null;
  external_ref: string | null;
}

export class ContextSnapshotService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  /**
   * Assemble and freeze a ContextPack snapshot.
   * Called when Run transitions to `preparing`.
   */
  async assembleSnapshot({
    contextPackId,
    assembledBy = "system",
    promptVersionRef,
    skillPackVersionRef,
  }: {
    contextPackId: string;
    assembledBy?: string;
    promptVersionRef?: string | null;
    skillPackVersionRef?: string | null;
  }): Promise<{ contextHash: string }> {
    return this.prisma.$transaction(async (tx: any) => {
      const pack = await tx.context_packs.findUniqueOrThrow({
        where: { id: contextPackId },
      });

      // ── 1. Freeze documents ──
      const documentIds: string[] = Array.isArray(pack.included_document_ids)
        ? pack.included_document_ids
        : [];

      const documents: DocumentSnapshot[] = [];
      if (documentIds.length > 0) {
        const docs = await tx.documents.findMany({
          where: { id: { in: documentIds } },
        });
        for (const doc of docs) {
          documents.push({
            document_id: doc.id,
            title: doc.title,
            version_label: doc.version_label ?? null,
            // Section 3: if version_label exists, record it; otherwise snapshot content
            content_snapshot: doc.version_label ? null : (doc.content_markdown ?? null),
            doc_type: doc.doc_type,
            status: doc.status,
          });
        }
      }

      // ── 2. Freeze artifacts ──
      const artifactIds: string[] = Array.isArray(pack.included_artifact_ids)
        ? pack.included_artifact_ids
        : [];

      const artifacts: ArtifactSnapshot[] = [];
      if (artifactIds.length > 0) {
        const arts = await tx.artifacts.findMany({
          where: { id: { in: artifactIds } },
        });
        for (const art of arts) {
          artifacts.push({
            artifact_id: art.id,
            title: art.title,
            artifact_type: art.artifact_type,
            version: art.version,
            state: art.state,
            // Section 4: always snapshot content for reproducibility
            content_snapshot: art.content_text ?? null,
            summary: art.summary ?? null,
            storage_kind: art.storage_kind,
            file_path: art.file_path ?? null,
            external_ref: art.external_ref ?? null,
          });
        }
      }

      // ── 3. Build manifest ──
      const assembledAt = new Date().toISOString();
      const manifest: ContextManifest = {
        assembled_at: assembledAt,
        assembled_by: assembledBy as "system" | "founder",
        documents,
        artifacts,
        file_paths: Array.isArray(pack.included_file_paths)
          ? pack.included_file_paths
          : [],
        assumptions: Array.isArray(pack.assumptions) ? pack.assumptions : [],
        prompt_version_ref: promptVersionRef ?? null,
        skill_pack_version_ref: skillPackVersionRef ?? null,
        summary: pack.summary ?? null,
        missing_context_notes: pack.missing_context_notes ?? null,
      };

      // ── 4. Compute hash ──
      const contextHash = await this.computeHash(manifest);

      // ── 5. Build source versions index ──
      const sourceVersions = {
        documents: documents.map((d) => ({
          id: d.document_id,
          version_label: d.version_label,
          has_content_snapshot: d.content_snapshot !== null,
        })),
        artifacts: artifacts.map((a) => ({
          id: a.artifact_id,
          version: a.version,
          has_content_snapshot: a.content_snapshot !== null,
        })),
        prompt_version_ref: promptVersionRef ?? null,
        skill_pack_version_ref: skillPackVersionRef ?? null,
      };

      // ── 6. Persist snapshot ──
      await tx.context_packs.update({
        where: { id: contextPackId },
        data: {
          context_manifest_json: manifest,
          context_hash: contextHash,
          source_versions_json: sourceVersions,
          assembled_at: assembledAt,
          assembled_by: assembledBy,
          prompt_version_ref: promptVersionRef ?? null,
          skill_pack_version_ref: skillPackVersionRef ?? null,
        },
      });

      logInfo("context_snapshot_assembled", {
        contextPackId,
        contextHash,
        documentCount: documents.length,
        artifactCount: artifacts.length,
      });

      return { contextHash };
    });
  }

  /**
   * Verify that a ContextPack's manifest still matches its stored hash.
   * Used for audit / consistency checks.
   */
  async verifyIntegrity(contextPackId: string): Promise<{ valid: boolean; storedHash: string | null; computedHash: string | null }> {
    try {
      const pack = await this.prisma.context_packs.findUniqueOrThrow({
        where: { id: contextPackId },
      });

      if (!pack.context_manifest_json || !pack.context_hash) {
        return { valid: false, storedHash: null, computedHash: null };
      }

      const computedHash = await this.computeHash(pack.context_manifest_json as ContextManifest);
      return {
        valid: computedHash === pack.context_hash,
        storedHash: pack.context_hash,
        computedHash,
      };
    } catch (error) {
      logError("context_integrity_check_error", {
        contextPackId,
        error: error instanceof Error ? error.message : "unknown",
      });
      return { valid: false, storedHash: null, computedHash: null };
    }
  }

  /**
   * SHA-256 hash of the manifest JSON (deterministic serialization).
   */
  private async computeHash(manifest: ContextManifest): Promise<string> {
    const canonicalJson = JSON.stringify(manifest, Object.keys(manifest).sort());
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalJson);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}
