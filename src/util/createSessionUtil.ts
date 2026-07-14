/*
 * Copyright 2021 WPPConnect Team
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
import { create, SocketState, StatusFind } from '@wppconnect-team/wppconnect';
import { Request } from 'express';

import { download } from '../controller/sessionController';
import { WhatsAppServer } from '../types/WhatsAppServer';
import chatWootClient from './chatWootClient';
import { autoDownload, callWebHook, startHelper } from './functions';
import { clientsArray, eventEmitter } from './sessionUtil';
import Factory from './tokenStore/factory';

export default class CreateSessionUtil {
  startChatWootClient(client: any) {
    if (client.config.chatWoot && !client._chatWootClient)
      client._chatWootClient = new chatWootClient(
        client.config.chatWoot,
        client.session
      );
    return client._chatWootClient;
  }

  async createSessionUtil(
    req: any,
    clientsArray: any,
    session: string,
    res?: any
  ) {
    try {
let client = this.getClient(session) as any;

// Se ficou preso em INITIALIZING por mais de 120 segundos,
// considera a sessão corrompida e libera nova tentativa.
if (
  client.status === 'INITIALIZING' &&
  client.initializingStartedAt &&
  Date.now() - client.initializingStartedAt > 120000
) {
  req.logger.warn(
    `[${session}] INITIALIZING preso por mais de 120 segundos. Limpando sessão.`
  );

  
client.status = "CLOSED";
  client.qrcode = null;

  
  try {
    await client.close().catch(() => {});
  } catch (err) {
    req.logger.warn(
      `[${session}] Erro ao fechar sessão travada: ${err}`
    );
  }

  

  delete clientsArray[session];

  client = this.getClient(session) as any;
}

if (client.status != null && client.status !== 'CLOSED') {
  req.logger.warn(
    `[${session}] Ignorando create(): status atual = ${client.status}`
  );
  return;
}

client.status = 'INITIALIZING';
client.initializingStartedAt = Date.now();
client.config = req.body;

      const tokenStore = new Factory();
      const myTokenStore = tokenStore.createTokenStory(client);
      const tokenData = await myTokenStore.getToken(session);

      // we need this to update phone in config every time session starts, so we can ask for code for it again.
      myTokenStore.setToken(session, tokenData ?? {});

      this.startChatWootClient(client);

      if (req.serverOptions.customUserDataDir) {
        req.serverOptions.createOptions.puppeteerOptions = {
          userDataDir: req.serverOptions.customUserDataDir + session,
        };
      }

req.logger.info(`[${session}] STEP 1 - Chamando wppconnect.create()`);
      


const CREATE_TIMEOUT = 90000;

let createTimeoutHandle: NodeJS.Timeout;

const timeoutPromise = new Promise((_, reject) => {
  createTimeoutHandle = setTimeout(() => {
    reject(new Error("CREATE_SESSION_TIMEOUT"));
  }, CREATE_TIMEOUT);
});



let wppClient: any;

try {

    wppClient = await Promise.race([
  create(
    Object.assign(
      {},
      { tokenStore: myTokenStore },
      client.config.proxy
        ? {
            proxy: {
              url: client.config.proxy?.url,
              username: client.config.proxy?.username,
              password: client.config.proxy?.password,
            },
          }
        : {},
      req.serverOptions.createOptions,
      {
        session: session,
        phoneNumber: client.config.phone ?? null,

        deviceName:
          client.config.phone == undefined
            ? client.config?.deviceName ||
              req.serverOptions.deviceName ||
              "WppConnect"
            : undefined,

        poweredBy:
          client.config.phone == undefined
            ? client.config?.poweredBy ||
              req.serverOptions.poweredBy ||
              "WPPConnect-Server"
            : undefined,

        catchLinkCode: (code: string) => {
          this.exportPhoneCode(req, client.config.phone, code, client, res);
        },

        catchQR: (
          base64Qr,
          asciiQR,
          attempt,
          urlCode
        ) => {
          req.logger.info(
            `[${session}] STEP 3 - QR RECEBIDO (attempt=${attempt})`
          );

          this.exportQR(req, base64Qr, urlCode, client, res);
        },

        onLoadingScreen: (percent, message) => {
          req.logger.info(
            `[${session}] LOADING ${percent}% - ${message}`
          );
        },

        statusFind: async (statusFind: StatusFind) => {
          try {
            eventEmitter.emit(
              `status-${client.session}`,
              client,
              statusFind
            );

            if (
              statusFind === StatusFind.autocloseCalled ||
              statusFind === StatusFind.disconnectedMobile
            ) {
              client.status = "CLOSED";
              client.qrcode = null;

              await client.close().catch(() => {});
            }

            callWebHook(client, req, "status-find", {
              status: statusFind,
              session: client.session,
            });

            req.logger.info(statusFind + "\n\n");
          } catch {}
        },
      }
    )
  ),

  timeoutPromise,
]);

} finally {

    clearTimeout(createTimeoutHandle);

}      


      
      req.logger.info(`[${session}] STEP 2 - wppconnect.create() retornou`);

      client = clientsArray[session] = Object.assign(wppClient, client);
      delete client.initializingStartedAt;
      await this.start(req, client);

      if (req.serverOptions.webhook.onParticipantsChanged) {
        await this.onParticipantsChanged(req, client);
      }

      if (req.serverOptions.webhook.onReactionMessage) {
        await this.onReactionMessage(client, req);
      }

      if (req.serverOptions.webhook.onRevokedMessage) {
        await this.onRevokedMessage(client, req);
      }

      if (req.serverOptions.webhook.onPollResponse) {
        await this.onPollResponse(client, req);
      }
      if (req.serverOptions.webhook.onLabelUpdated) {
        await this.onLabelUpdated(client, req);
      }
    } catch (e) {
  req.logger.error(e);
  req.logger.error(
    `[${session}] createSessionUtil falhou`,
    e
);


      
  try {
    const client = this.getClient(session) as any;

    client.status = "CLOSED";
    client.qrcode = null;
    delete client.initializingStartedAt;
    delete clientsArray[session];

    req.logger.warn(
      `[${session}] Sessão resetada após erro durante create()`
    );

  } catch (cleanupError) {
    req.logger.error(cleanupError);
  }
}
  }

  async opendata(req: Request, session: string, res?: any) {
    await this.createSessionUtil(req, clientsArray, session, res);
  }

  exportPhoneCode(
    req: any,
    phone: any,
    phoneCode: any,
    client: WhatsAppServer,
    res?: any
  ) {
    eventEmitter.emit(`phoneCode-${client.session}`, phoneCode, client);

    Object.assign(client, {
      status: 'PHONECODE',
      phoneCode: phoneCode,
      phone: phone,
    });

    req.io.emit('phoneCode', {
      data: phoneCode,
      phone: phone,
      session: client.session,
    });

    callWebHook(client, req, 'phoneCode', {
      phoneCode: phoneCode,
      phone: phone,
      session: client.session,
    });

    if (res && !res._headerSent)
      res.status(200).json({
        status: 'phoneCode',
        phone: phone,
        phoneCode: phoneCode,
        session: client.session,
      });
  }

  exportQR(
    req: any,
    qrCode: any,
    urlCode: any,
    client: WhatsAppServer,
    res?: any
  ) {
    eventEmitter.emit(`qrcode-${client.session}`, qrCode, urlCode, client);
    Object.assign(client, {
      status: 'QRCODE',
      qrcode: qrCode,
      urlcode: urlCode,
    });

    qrCode = qrCode.replace('data:image/png;base64,', '');
    const imageBuffer = Buffer.from(qrCode, 'base64');

    req.io.emit('qrCode', {
      data: 'data:image/png;base64,' + imageBuffer.toString('base64'),
      session: client.session,
    });

    callWebHook(client, req, 'qrcode', {
      qrcode: qrCode,
      urlcode: urlCode,
      session: client.session,
    });
    if (res && !res._headerSent)
      res.status(200).json({
        status: 'qrcode',
        qrcode: qrCode,
        urlcode: urlCode,
        session: client.session,
      });
  }

  async onParticipantsChanged(req: any, client: any) {
    await client.isConnected();
    await client.onParticipantsChanged((message: any) => {
      callWebHook(client, req, 'onparticipantschanged', message);
    });
  }

  async start(req: Request, client: WhatsAppServer) {
    try {
      await client.isConnected();
      Object.assign(client, { status: 'CONNECTED', qrcode: null });

      req.logger.info(`Started Session: ${client.session}`);
      //callWebHook(client, req, 'session-logged', { status: 'CONNECTED'});
      req.io.emit('session-logged', { status: true, session: client.session });
      startHelper(client, req);
    } catch(error){

    req.logger.error(error);

    client.status="CLOSED";

    delete clientsArray[client.session];

    req.io.emit(
        "session-error",
        client.session
    );

}

await this.checkStateSession(client, req);

if (!req.serverOptions.senderOnly) {
  await this.listenMessages(client, req);
}

    if (req.serverOptions.webhook.listenAcks) {
      await this.listenAcks(client, req);
    }

    if (req.serverOptions.webhook.onPresenceChanged) {
      await this.onPresenceChanged(client, req);
    }
  }

  async checkStateSession(client: WhatsAppServer, req: Request) {
    await client.onStateChange((state) => {
      req.logger.info(`State Change ${state}: ${client.session}`);
      const conflits = [SocketState.CONFLICT];

      if (conflits.includes(state)) {
        client.useHere();
      }
    });
  }

  async listenMessages(client: WhatsAppServer, req: Request) {
    await client.onMessage(async (message: any) => {
      eventEmitter.emit(`mensagem-${client.session}`, client, message);
      callWebHook(client, req, 'onmessage', message);
      if (message.type === 'location')
        client.onLiveLocation(message.sender.id, (location) => {
          callWebHook(client, req, 'location', location);
        });
    });

    await client.onAnyMessage(async (message: any) => {
      message.session = client.session;

      if (message.type === 'sticker') {
        download(message, client, req.logger);
      }

      if (
        req.serverOptions?.websocket?.autoDownload ||
        (req.serverOptions?.webhook?.autoDownload && message.fromMe == false)
      ) {
        await autoDownload(client, req, message);
      }

      req.io.emit('received-message', { response: message });
      if (req.serverOptions.webhook.onSelfMessage && message.fromMe)
        callWebHook(client, req, 'onselfmessage', message);
    });

    await client.onIncomingCall(async (call) => {
      req.io.emit('incomingcall', call);
      callWebHook(client, req, 'incomingcall', call);
    });
  }

  async listenAcks(client: WhatsAppServer, req: Request) {
    await client.onAck(async (ack) => {
      req.io.emit('onack', ack);
      callWebHook(client, req, 'onack', ack);
    });
  }

  async onPresenceChanged(client: WhatsAppServer, req: Request) {
    await client.onPresenceChanged(async (presenceChangedEvent) => {
      req.io.emit('onpresencechanged', presenceChangedEvent);
      callWebHook(client, req, 'onpresencechanged', presenceChangedEvent);
    });
  }

  async onReactionMessage(client: WhatsAppServer, req: Request) {
    await client.isConnected();
    await client.onReactionMessage(async (reaction: any) => {
      req.io.emit('onreactionmessage', reaction);
      callWebHook(client, req, 'onreactionmessage', reaction);
    });
  }

  async onRevokedMessage(client: WhatsAppServer, req: Request) {
    await client.isConnected();
    await client.onRevokedMessage(async (response: any) => {
      req.io.emit('onrevokedmessage', response);
      callWebHook(client, req, 'onrevokedmessage', response);
    });
  }
  async onPollResponse(client: WhatsAppServer, req: Request) {
    await client.isConnected();
    await client.onPollResponse(async (response: any) => {
      req.io.emit('onpollresponse', response);
      callWebHook(client, req, 'onpollresponse', response);
    });
  }
  async onLabelUpdated(client: WhatsAppServer, req: Request) {
    await client.isConnected();
    await client.onUpdateLabel(async (response: any) => {
      req.io.emit('onupdatelabel', response);
      callWebHook(client, req, 'onupdatelabel', response);
    });
  }

  encodeFunction(data: any, webhook: any) {
    data.webhook = webhook;
    return JSON.stringify(data);
  }

  decodeFunction(text: any, client: any) {
    const object = JSON.parse(text);
    if (object.webhook && !client.webhook) client.webhook = object.webhook;
    delete object.webhook;
    return object;
  }

  getClient(session: any) {
    let client = clientsArray[session];

    if (!client)
      client = clientsArray[session] = {
        status: null,
        session: session,
      } as any;
    return client;
  }
}
