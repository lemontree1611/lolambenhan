const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Health check để Render biết service sống
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("WebSocket server is running");
});

const wss = new WebSocketServer({ server });

// roomId -> Set(ws clients)
const rooms = new Map();
// roomId -> last state (để người vào sau nhận state gần nhất)
const lastStateByRoom = new Map();

function safeSend(ws, obj) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function broadcast(roomId, data, exceptWs = null) {
  const clients = rooms.get(roomId);
  if (!clients) return;
  for (const client of clients) {
    if (client !== exceptWs && client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

wss.on("connection", (ws) => {
  let roomId = null;

  ws.on("message", (buf) => {
    let msg;
    try {
      msg = JSON.parse(buf.toString("utf8"));
    } catch {
      return;
    }

    // join room
    if (msg.type === "join" && typeof msg.room === "string" && msg.room.trim()) {
      roomId = msg.room.trim();

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(ws);

      // gửi state gần nhất cho người mới vào
      const last = lastStateByRoom.get(roomId);
      if (last) safeSend(ws, { type: "state", payload: last });

      safeSend(ws, { type: "joined", room: roomId });
      return;
    }

    if (!roomId) return;

    // state sync
    if (msg.type === "state") {
      lastStateByRoom.set(roomId, msg.payload ?? {});
      const data = JSON.stringify({ type: "state", payload: msg.payload ?? {} });
      broadcast(roomId, data, ws);
      return;
    }

    // clear sync
    if (msg.type === "clear") {
      lastStateByRoom.set(roomId, {});
      const data = JSON.stringify({ type: "clear" });
      broadcast(roomId, data, ws);
      return;
    }
  });

  ws.on("close", () => {
    if (!roomId) return;
    const set = rooms.get(roomId);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) {
      rooms.delete(roomId);
      lastStateByRoom.delete(roomId);
    }
  });
});

server.listen(PORT, () => {
  console.log("WS listening on", PORT);
});
