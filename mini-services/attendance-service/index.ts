import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// In-memory store for on-duty SAs (keyed by userId)
const onDutySAs = new Map<
  string,
  {
    userId: string;
    clockedInAt: Date;
    socketId: string;
  }
>();

// Get all currently on-duty user IDs
function getOnDutyList(): string[] {
  return Array.from(onDutySAs.keys());
}

io.on("connection", (socket) => {
  console.log(`[Attendance] Client connected: ${socket.id}`);

  // Handle clock in
  socket.on(
    "clock_in",
    (data: { userId: string }, callback?: (ack: { success: boolean; message: string }) => void) => {
      if (!data.userId) {
        callback?.({ success: false, message: "userId is required" });
        return;
      }

      const alreadyOnDuty = onDutySAs.has(data.userId);
      onDutySAs.set(data.userId, {
        userId: data.userId,
        clockedInAt: new Date(),
        socketId: socket.id,
      });

      console.log(`[Attendance] User ${data.userId} clocked in${alreadyOnDuty ? " (updated socket)" : ""}`);

      // Broadcast the on-duty status to all clients
      io.emit("clock_in", { userId: data.userId });
      io.emit("status_update", { onDutySAs: getOnDutyList() });

      callback?.({ success: true, message: "Clocked in successfully" });
    }
  );

  // Handle clock out
  socket.on(
    "clock_out",
    (data: { userId: string }, callback?: (ack: { success: boolean; message: string; hoursWorked?: number }) => void) => {
      if (!data.userId) {
        callback?.({ success: false, message: "userId is required" });
        return;
      }

      const record = onDutySAs.get(data.userId);
      if (record) {
        const hoursWorked =
          (new Date().getTime() - record.clockedInAt.getTime()) / (1000 * 60 * 60);
        onDutySAs.delete(data.userId);

        console.log(
          `[Attendance] User ${data.userId} clocked out (worked ${hoursWorked.toFixed(2)}h)`
        );

        // Broadcast to all clients
        io.emit("clock_out", { userId: data.userId });
        io.emit("status_update", { onDutySAs: getOnDutyList() });

        callback?.({
          success: true,
          message: "Clocked out successfully",
          hoursWorked: parseFloat(hoursWorked.toFixed(2)),
        });
      } else {
        console.log(`[Attendance] User ${data.userId} was not on duty`);
        callback?.({ success: false, message: "User was not on duty" });
      }
    }
  );

  // Handle get_status request
  socket.on(
    "get_status",
    (callback?: (data: { onDutySAs: string[] }) => void) => {
      const list = getOnDutyList();
      console.log(`[Attendance] Status requested: ${list.length} SAs on duty`);
      socket.emit("status_update", { onDutySAs: list });
      callback?.({ onDutySAs: list });
    }
  );

  // Handle heartbeat / keep-alive
  socket.on("heartbeat", (_data: unknown, callback?: () => void) => {
    callback?.();
  });

  // Handle disconnect - clean up any on-duty records for this socket
  socket.on("disconnect", () => {
    console.log(`[Attendance] Client disconnected: ${socket.id}`);

    // Remove any on-duty SA records tied to this socket
    for (const [userId, record] of onDutySAs.entries()) {
      if (record.socketId === socket.id) {
        onDutySAs.delete(userId);
        console.log(`[Attendance] User ${userId} auto-clocked out (disconnected)`);
        io.emit("clock_out", { userId });
      }
    }

    // Broadcast updated status
    io.emit("status_update", { onDutySAs: getOnDutyList() });
  });

  socket.on("error", (error) => {
    console.error(`[Attendance] Socket error (${socket.id}):`, error);
  });
});

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[Attendance] WebSocket server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Attendance] Received SIGTERM, shutting down...");
  io.close();
  httpServer.close(() => {
    console.log("[Attendance] Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("[Attendance] Received SIGINT, shutting down...");
  io.close();
  httpServer.close(() => {
    console.log("[Attendance] Server closed");
    process.exit(0);
  });
});
