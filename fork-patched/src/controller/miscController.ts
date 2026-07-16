/*
 * Copyright 2023 WPPConnect Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

import { logger } from '..';
import config from '../config';
import { backupSessions, restoreSessions } from '../util/manageSession';
import { clientsArray } from '../util/sessionUtil';

// AchadinhosBot patch: resolve o caminho real do arquivo de token do FileTokenStore.
// O default do WPPConnect é `path.resolve(process.cwd(), 'tokens', <session>.data.json)`.
// O código original usava `__dirname + '../../../tokens/...'` (concatenação de string sem
// separador), gerando um caminho inválido tipo `/app/dist/controller../../../tokens/...`,
// então `fs.existsSync` nunca acha o arquivo e o token NUNCA é apagado. Resultado:
// clear-session-data volta 200 OK mas o token corrompido continua no disco, e no próximo
// start-session o WPPConnect tenta reusar esse token → wedge em INITIALIZING → QR nunca sai.
function resolveTokenPath(session: string): string {
  const folder = (config as any).folderNameToken || './tokens';
  return path.resolve(process.cwd(), folder, `${session}.data.json`);
}

// Envolvemos client.logout()/close() com timeout para não travar o endpoint quando o
// Chromium do WA-JS está wedged (bug clássico: logout() pendura para sempre).
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T | null> {
  return await Promise.race<Promise<T | null>>([
    p.then((v) => v as T | null).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]).catch(() => null);
}

export async function backupAllSessions(req: Request, res: Response) {
  /**
     * #swagger.tags = ["Misc"]
     * #swagger.description = 'Please, open the router in your browser, in swagger this not run'
     * #swagger.produces = ['application/octet-stream']
     * #swagger.consumes = ['application/octet-stream']
       #swagger.autoBody=false
       #swagger.parameters["secretkey"] = {
          required: true,
          schema: 'THISISMYSECURETOKEN'
       }
       #swagger.responses[200] = {
        description: 'A ZIP file contaings your backup. Please, open this link in your browser',
        content: {
          "application/zip": {
            schema: {}
          }
        },
      }
     */
  const { secretkey } = req.params;

  if (secretkey !== config.secretKey) {
    res.status(400).json({
      response: 'error',
      message: 'The token is incorrect',
    });
  }

  try {
    res.setHeader('Content-Type', 'application/zip');
    res.send(await backupSessions(req));
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error on backup session',
      error: error,
    });
  }
}

export async function restoreAllSessions(req: Request, res: Response) {
  /**
   #swagger.tags = ["Misc"]
   #swagger.autoBody=false
    #swagger.parameters["secretkey"] = {
    required: true,
    schema: 'THISISMYSECURETOKEN'
    }
    #swagger.requestBody = {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: 'object',
            properties: {
              file: {
                type: "string",
                format: "binary"
              }
            },
            required: ['file'],
          }
        }
      }
    }
  */
  const { secretkey } = req.params;

  if (secretkey !== config.secretKey) {
    res.status(400).json({
      response: 'error',
      message: 'The token is incorrect',
    });
  }

  try {
    const result = await restoreSessions(req, req.file as any);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({
      status: false,
      message: 'Error on restore session',
      error: error,
    });
  }
}

export async function takeScreenshot(req: Request, res: Response) {
  /**
   #swagger.tags = ["Misc"]
   #swagger.autoBody=false
    #swagger.security = [{
          "bearerAuth": []
    }]
    #swagger.parameters["session"] = {
    schema: 'NERDWHATS_AMERICA'
    }
  */

  try {
    const result = await req.client.takeScreenshot();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({
      status: false,
      message: 'Error on take screenshot',
      error: error,
    });
  }
}

export async function clearSessionData(req: Request, res: Response) {
  /**
   #swagger.tags = ["Misc"]
   #swagger.autoBody=false
    #swagger.parameters["secretkey"] = {
    required: true,
    schema: 'THISISMYSECURETOKEN'
    }
    #swagger.parameters["session"] = {
    schema: 'NERDWHATS_AMERICA'
    }
  */

  try {
    const { secretkey, session } = req.params;

    if (secretkey !== config.secretKey) {
      return res.status(400).json({
        response: 'error',
        message: 'The token is incorrect',
      });
    }

    // AchadinhosBot patch: logout com timeout de 8s. Sem isso, um Chromium wedged
    // trava o endpoint inteiro e o clear-session-data nunca chega a apagar o disco.
    if (req?.client?.page) {
      delete clientsArray[req.params.session];
      await withTimeout(req.client.logout(), 8000, 'logout');
      try { await withTimeout((req.client as any).close?.(), 8000, 'close'); } catch {}
    } else {
      // mesmo sem cliente vivo, garante que não sobra referência
      delete clientsArray[session];
    }

    const userDataPath = (config.customUserDataDir || '/tmp/userDataDir/') + session;
    const pathToken = resolveTokenPath(session);
    const removed: Record<string, boolean> = { userDataDir: false, token: false };

    if (fs.existsSync(userDataPath)) {
      await fs.promises.rm(userDataPath, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 500,
      }).catch((e) => logger.warn(`[clearSessionData] rm userDataDir failed: ${e?.message}`));
      removed.userDataDir = true;
    }
    if (fs.existsSync(pathToken)) {
      await fs.promises.rm(pathToken, { force: true }).catch((e) =>
        logger.warn(`[clearSessionData] rm token failed: ${e?.message}`)
      );
      removed.token = true;
    }

    logger.info(
      `[clearSessionData] session=${session} userDataDir=${removed.userDataDir} token=${removed.token} tokenPath=${pathToken}`
    );

    return res.status(200).json({ success: true, removed, tokenPath: pathToken });
  } catch (error: any) {
    logger.error(error);
    return res.status(500).json({
      status: false,
      message: 'Error on clear session data',
      error: error?.message || String(error),
    });
  }
}

export async function setLimit(req: Request, res: Response) {
  /**
   #swagger.tags = ["Misc"]
   #swagger.description = 'Change limits of whatsapp web. Types value: maxMediaSize, maxFileSize, maxShare, statusVideoMaxDuration, unlimitedPin;'
   #swagger.autoBody=false
    #swagger.security = [{
          "bearerAuth": []
    }]
    #swagger.parameters["session"] = {
    schema: 'NERDWHATS_AMERICA'
    }
     #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              value: { type: 'any' },
            },
            required: ['type', 'value'],
          },
          examples: {
            'Default': {
              value: {
                type: 'maxFileSize',
                value: 104857600
              },
            },
          },
        },
      },
    }
  */

  try {
    const { type, value } = req.body;
    if (!type || !value) throw new Error('Send de type and value');

    const result = await req.client.setLimit(type, value);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({
      status: false,
      message: 'Error on set limit',
      error: error,
    });
  }
}
