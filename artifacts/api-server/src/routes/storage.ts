import { Readable } from 'stream';
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from '@workspace/api-zod';
import {
  raw,
  Router,
  type IRouter,
  type Request,
  type Response,
} from 'express';

import { ObjectPermission } from '../lib/objectAcl';
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function hasAuthenticatedSession(
  req: Request,
): req is Request & { isAuthenticated: () => boolean } {
  if (
    !('isAuthenticated' in req) ||
    typeof req.isAuthenticated !== 'function'
  ) {
    return false;
  }

  return req.isAuthenticated();
}

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * Requires auth middleware so public callers cannot mint write-capable URLs.
 */
router.post(
  '/storage/uploads/request-url',
  async (req: Request, res: Response) => {
    if (!(req as any).session?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;

      let uploadURL: string;
      let objectPath: string;
      if (objectStorageService.isLocalStorage()) {
        const localUpload =
          objectStorageService.createLocalObjectEntityUploadURL(
            `${req.protocol}://${req.get('host')}`,
          );
        uploadURL = localUpload.uploadURL;
        objectPath = localUpload.objectPath;
      } else {
        uploadURL = await objectStorageService.getObjectEntityUploadURL();
        objectPath =
          objectStorageService.normalizeObjectEntityPath(uploadURL);
      }

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

/**
 * PUT /storage/uploads/local/:objectId
 *
 * Receives the file body for VPS-local storage. The URL is an expiring,
 * HMAC-signed ticket returned by the request-url endpoint, so this endpoint
 * does not need a session cookie.
 */
router.put(
  '/storage/uploads/local/:objectId',
  raw({ type: '*/*', limit: '15mb' }),
  async (req: Request, res: Response) => {
    if (!objectStorageService.isLocalStorage()) {
      res.status(404).json({ error: 'Local storage is not enabled.' });
      return;
    }

    const rawObjectId = req.params.objectId;
    const objectId = Array.isArray(rawObjectId) ? rawObjectId[0] : rawObjectId;
    if (!objectId) {
      res.status(400).json({ error: 'ID upload tidak valid.' });
      return;
    }
    const expires = String(req.query.expires ?? '');
    const signature = String(req.query.signature ?? '');
    if (
      !objectStorageService.verifyLocalUploadTicket(
        objectId,
        expires,
        signature,
      )
    ) {
      res.status(403).json({ error: 'Upload URL tidak valid atau sudah kedaluwarsa.' });
      return;
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: 'File gambar kosong atau tidak valid.' });
      return;
    }

    try {
      await objectStorageService.saveLocalObjectEntity(
        `/objects/uploads/${objectId}`,
        req.body,
        req.get('content-type') || 'application/octet-stream',
      );
      res.status(200).json({ ok: true });
    } catch (error) {
      req.log.error({ err: error }, 'Error saving local object');
      res.status(500).json({ error: 'Gagal menyimpan gambar di server.' });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile =
      await objectStorageService.getObjectEntityFile(objectPath);

    // --- Protected route example (uncomment when using replit-auth) ---
    // if (!req.isAuthenticated()) {
    //   res.status(401).json({ error: "Unauthorized" });
    //   return;
    // }
    // const canAccess = await objectStorageService.canAccessObjectEntity({
    //   userId: req.user.id,
    //   objectFile,
    //   requestedPermission: ObjectPermission.READ,
    // });
    // if (!canAccess) {
    //   res.status(403).json({ error: "Forbidden" });
    //   return;
    // }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
