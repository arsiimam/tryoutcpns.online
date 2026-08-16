import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { File, Storage } from '@google-cloud/storage';

import {
  canAccessObject,
  getObjectAclPolicy,
  ObjectAclPolicy,
  ObjectPermission,
  setObjectAclPolicy,
} from './objectAcl';

const REPLIT_SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';

export const objectStorageClient = new Storage({
  credentials: {
    audience: 'replit',
    subject_token_type: 'access_token',
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: 'external_account',
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: 'json',
        subject_token_field_name: 'access_token',
      },
    },
    universe_domain: 'googleapis.com',
  },
  projectId: '',
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export type LocalObjectFile = {
  kind: 'local';
  filePath: string;
  objectPath: string;
  contentType?: string;
};

export class ObjectStorageService {
  isLocalStorage(): boolean {
    return process.env.OBJECT_STORAGE_MODE === 'local';
  }

  private getLocalStorageDir(): string {
    const dir = process.env.LOCAL_STORAGE_DIR?.trim();
    if (!dir) {
      throw new Error(
        'LOCAL_STORAGE_DIR not set. Set OBJECT_STORAGE_MODE=local and ' +
          'LOCAL_STORAGE_DIR to a writable directory on the VPS.',
      );
    }
    return path.resolve(dir);
  }

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || '';
    const paths = Array.from(
      new Set(
        pathsStr
          .split(',')
          .map((path) => path.trim())
          .filter((path) => path.length > 0),
      ),
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          'tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths).',
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    if (this.isLocalStorage()) {
      return this.getLocalStorageDir();
    }

    const dir = process.env.PRIVATE_OBJECT_DIR || '';
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          'tool and set PRIVATE_OBJECT_DIR env var.',
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(
    file: File | LocalObjectFile,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    if (isLocalObjectFile(file)) {
      const stats = await fs.stat(file.filePath);
      const nodeStream = createReadStream(file.filePath);
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;

      return new Response(webStream, {
        headers: {
          'Content-Type': file.contentType || 'application/octet-stream',
          'Content-Length': String(stats.size),
          'Cache-Control': `private, max-age=${cacheTtlSec}`,
        },
      });
    }

    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === 'public';

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      'Content-Type':
        (metadata.contentType as string) || 'application/octet-stream',
      'Cache-Control': `${isPublic ? 'public' : 'private'}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) {
      headers['Content-Length'] = String(metadata.size);
    }

    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(): Promise<string> {
    if (this.isLocalStorage()) {
      throw new Error(
        'Local storage requires createLocalObjectEntityUploadURL(baseURL).',
      );
    }

    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          'tool and set PRIVATE_OBJECT_DIR env var.',
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: 'PUT',
      ttlSec: 900,
    });
  }

  createLocalObjectEntityUploadURL(baseURL: string): {
    uploadURL: string;
    objectPath: string;
  } {
    const objectId = randomUUID();
    const objectPath = `/objects/uploads/${objectId}`;
    const expires = Math.floor(Date.now() / 1000) + 15 * 60;
    const signature = this.createLocalUploadSignature(objectId, expires);
    const uploadURL = new URL(
      `/api/storage/uploads/local/${objectId}`,
      baseURL,
    );
    uploadURL.searchParams.set('expires', String(expires));
    uploadURL.searchParams.set('signature', signature);

    return {
      uploadURL: uploadURL.toString(),
      objectPath,
    };
  }

  verifyLocalUploadTicket(
    objectId: string,
    expiresRaw: string,
    signature: string,
  ): boolean {
    const expires = Number(expiresRaw);
    if (!Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000)) {
      return false;
    }

    const expected = this.createLocalUploadSignature(objectId, expires);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  }

  async saveLocalObjectEntity(
    objectPath: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    if (!this.isLocalStorage()) {
      throw new Error('Local storage mode is not enabled.');
    }

    const filePath = this.getLocalFilePath(objectPath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
    await fs.writeFile(
      `${filePath}.meta.json`,
      JSON.stringify({ contentType }),
      'utf8',
    );
  }

  async saveLocalObjectEntityFromBuffer(
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    const objectPath = `/objects/uploads/${randomUUID()}`;
    await this.saveLocalObjectEntity(objectPath, body, contentType);
    return objectPath;
  }

  async getObjectEntityFile(
    objectPath: string,
  ): Promise<File | LocalObjectFile> {
    if (this.isLocalStorage()) {
      const filePath = this.getLocalFilePath(objectPath);
      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
          throw new ObjectNotFoundError();
        }
      } catch (error) {
        if (error instanceof ObjectNotFoundError) {
          throw error;
        }
        throw new ObjectNotFoundError();
      }

      let contentType: string | undefined;
      try {
        const metadata = JSON.parse(
          await fs.readFile(`${filePath}.meta.json`, 'utf8'),
        ) as { contentType?: string };
        contentType = metadata.contentType;
      } catch {
        // Older files may not have metadata; use a safe default.
      }

      return { kind: 'local', filePath, objectPath, contentType };
    }

    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split('/');
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join('/');
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith('/')) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith('https://storage.googleapis.com/')) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith('/')) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith('/')) {
      return normalizedPath;
    }

    if (this.isLocalStorage()) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath) as File;
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File | LocalObjectFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    if (isLocalObjectFile(objectFile)) {
      return true;
    }

    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  private createLocalUploadSignature(
    objectId: string,
    expires: number,
  ): string {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      throw new Error('SESSION_SECRET is required for local upload URLs.');
    }
    return createHmac('sha256', secret)
      .update(`${objectId}:${expires}`)
      .digest('hex');
  }

  private getLocalFilePath(objectPath: string): string {
    const match = /^\/objects\/uploads\/([a-f0-9-]+)$/i.exec(objectPath);
    if (!match) {
      throw new ObjectNotFoundError();
    }
    return path.join(this.getLocalStorageDir(), 'uploads', match[1]);
  }
}

function isLocalObjectFile(
  file: File | LocalObjectFile,
): file is LocalObjectFile {
  return 'kind' in file && file.kind === 'local';
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  const pathParts = path.split('/');
  if (pathParts.length < 3) {
    throw new Error('Invalid path: must contain at least a bucket name');
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join('/');

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: 'GET' | 'PUT' | 'DELETE' | 'HEAD';
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`,
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
