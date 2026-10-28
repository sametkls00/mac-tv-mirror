import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApplication, privateIPv4 } from './server.mjs';

export async function startContainerServer({ lanAddress, senderPort = 8765, receiverPort = 8766, publicPort, bindAddress = '0.0.0.0', quiet = false } = {}) {
  if (!privateIPv4(lanAddress)) throw new Error('TV_LAN_IP must be the Mac host’s private LAN IPv4 address.');
  if (![senderPort, receiverPort].every((port) => Number.isInteger(port) && port >= 1 && port <= 65535) || senderPort === receiverPort) {
    throw new Error('SENDER_PORT and RECEIVER_PORT must be distinct valid ports.');
  }
  if (publicPort !== undefined && (!Number.isInteger(publicPort) || publicPort < 1 || publicPort > 65535)) throw new Error('PUBLIC_PORT must be a valid port.');
  const app = createApplication({
    lanAddress, receiverPort: publicPort || receiverPort,
    publicPorts: publicPort ? { sender: publicPort, receiver: publicPort } : undefined,
  });
  const servers = [];
  try {
    for (const [role, port] of [['sender', senderPort], ['receiver', receiverPort]]) {
      const server = createServer((req, res) => app.handle(req, res, role));
      server.requestTimeout = 15000;
      server.headersTimeout = 10000;
      servers.push(server);
      await new Promise((accept, reject) => {
        server.once('error', reject);
        server.listen(port, bindAddress, accept);
      });
    }
  } catch (error) {
    app.close();
    for (const server of servers) { server.close(); server.closeAllConnections(); }
    throw error;
  }
  if (!quiet) {
    console.log(`Mac: http://localhost:${publicPort || senderPort}/mac`);
    console.log(`TV: http://${lanAddress}:${publicPort || receiverPort}/`);
    console.log(`Pairing code / Eşleştirme kodu: ${app.pairCode}`);
    console.log('IMPORTANT: Publish the sender port on 127.0.0.1 ONLY. Use the supplied Compose configuration.');
    console.log('ÖNEMLİ: Gönderici portu yalnızca 127.0.0.1 üzerinde yayınlanmalı. Sağlanan Compose yapılandırmasını kullan.');
  }
  return {
    close: async () => {
      app.close();
      await Promise.all(servers.map((server) => new Promise((done) => {
        server.close(done);
        server.closeAllConnections();
      })));
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const service = await startContainerServer({
      lanAddress: process.env.TV_LAN_IP,
      senderPort: Number(process.env.SENDER_PORT || 8765),
      receiverPort: Number(process.env.RECEIVER_PORT || 8766),
      publicPort: process.env.PUBLIC_PORT ? Number(process.env.PUBLIC_PORT) : undefined,
    });
    const finish = async () => { await service.close(); process.exit(0); };
    process.once('SIGINT', finish);
    process.once('SIGTERM', finish);
  } catch (error) {
    console.error(`Container startup failed: ${error.message}`);
    process.exitCode = 1;
  }
}
