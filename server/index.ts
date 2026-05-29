import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import { activity, assets, avs, getStats, operators, positions, wallet } from "./data";
import { confirmRestake, connectWallet, createPreview, isRestakingApiError, markExiting } from "./restaking";

const mode = "mock";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (_request, response) => {
    sendOk(response, "healthy", {
      service: "restaking-demo-api",
      mode,
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/bootstrap", (_request, response) => {
    sendOk(response, "bootstrapped", {
      mode,
      ...getSnapshot()
    });
  });

  app.post(
    "/api/wallet/connect",
    route((request, response) => {
      sendOk(response, "wallet_connected", {
        mode,
        wallet: connectWallet(request.body)
      });
    })
  );

  app.post(
    "/api/restake/preview",
    route((request, response) => {
      sendOk(response, "preview_ready", {
        mode,
        preview: createPreview(request.body)
      });
    })
  );

  app.post(
    "/api/restake/confirm",
    route((request, response) => {
      const result = confirmRestake(request.body);

      sendOk(
        response,
        "restake_confirmed",
        {
          mode,
          ...result,
          wallet,
          assets,
          positions,
          activity,
          stats: getStats()
        },
        201
      );
    })
  );

  app.get("/api/portfolio", (_request, response) => {
    sendOk(response, "portfolio_ready", {
      mode,
      wallet,
      assets,
      positions,
      activity,
      stats: getStats()
    });
  });

  app.post(
    "/api/positions/:positionId/exit",
    route((request, response) => {
      const positionId = Array.isArray(request.params.positionId)
        ? request.params.positionId[0]
        : request.params.positionId;
      const position = markExiting(positionId);

      sendOk(response, "exit_requested", {
        mode,
        position,
        positions,
        activity,
        stats: getStats()
      });
    })
  );

  app.use((request, response) => {
    sendError(response, 404, "NOT_FOUND", `No mock API route for ${request.method} ${request.path}.`);
  });

  app.use(handleError);

  return app;
}

function route(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function getSnapshot() {
  return {
    wallet,
    assets,
    avs,
    operators,
    positions,
    activity,
    stats: getStats()
  };
}

function sendOk(response: Response, status: string, payload: Record<string, unknown>, httpStatus = 200) {
  response.status(httpStatus).json({
    ok: true,
    status,
    ...payload
  });
}

function sendError(
  response: Response,
  httpStatus: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  response.status(httpStatus).json({
    ok: false,
    status: "error",
    mode,
    code,
    error: message,
    details
  });
}

const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
  if (isJsonSyntaxError(error)) {
    sendError(response, 400, "INVALID_JSON", "Request body must be valid JSON.");
    return;
  }

  if (isRestakingApiError(error)) {
    sendError(response, error.status, error.code, error.message, error.details);
    return;
  }

  console.error(error);
  sendError(response, 500, "INTERNAL_SERVER_ERROR", "Unexpected mock API error.");
};

function isJsonSyntaxError(error: unknown) {
  return error instanceof SyntaxError && isRecord(error) && "body" in error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDirectRun() {
  const entrypoint = process.argv[1];
  return entrypoint ? fileURLToPath(import.meta.url) === path.resolve(entrypoint) : false;
}

function readPort() {
  const port = Number(process.env.PORT ?? 8787);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
  }

  return port;
}

if (isDirectRun()) {
  const port = readPort();
  const host = process.env.HOST ?? "0.0.0.0";

  createApp().listen(port, host, () => {
    const displayHost = host === "0.0.0.0" ? "localhost" : host;
    console.log(`Restaking demo API running on http://${displayHost}:${port}`);
  });
}
