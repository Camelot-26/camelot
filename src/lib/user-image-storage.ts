import "server-only";

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type StoredUserImage = {
  body: Uint8Array;
};

export interface UserImageStorage {
  save(key: string, body: Buffer): Promise<void>;
  get(key: string): Promise<StoredUserImage | null>;
  delete(key: string): Promise<void>;
}

const USER_IMAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:jpg|png|webp)$/;

const localUserImageStorage: UserImageStorage = {
  async save(key, body) {
    const filePath = getLocalImagePath(key);
    await mkdir(getLocalImageDirectory(), { recursive: true });
    await writeFile(filePath, body, { flag: "wx" });
  },

  async get(key) {
    try {
      return { body: await readFile(getLocalImagePath(key)) };
    } catch (error) {
      if (isMissingFile(error)) {
        return null;
      }
      throw error;
    }
  },

  async delete(key) {
    try {
      await unlink(getLocalImagePath(key));
    } catch (error) {
      if (!isMissingFile(error)) {
        throw error;
      }
    }
  },
};

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function getLocalImageDirectory() {
  return process.env.USER_IMAGE_STORAGE_DIR
    ? join(process.env.USER_IMAGE_STORAGE_DIR)
    : join(process.cwd(), ".data", "user-images");
}

function getLocalImagePath(key: string) {
  if (!USER_IMAGE_KEY_PATTERN.test(key)) {
    throw new Error("Invalid user image storage key.");
  }
  return join(getLocalImageDirectory(), key);
}

export function getUserImageStorage(): UserImageStorage {
  const provider = process.env.USER_IMAGE_STORAGE_PROVIDER ?? "local";
  if (provider === "local") {
    return localUserImageStorage;
  }

  throw new Error(
    `Unsupported user image storage provider "${provider}". Only "local" is currently available.`,
  );
}
