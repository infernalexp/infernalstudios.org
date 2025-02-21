// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import chalk from "chalk";
import cors from "cors";
import express, { Express, NextFunction, Request, Response } from "express";
import expressStaticGzip from "express-static-gzip";
import helmet from "helmet";
import { Logger } from "logerian";
import path from "path";
import { ZodError } from "zod";
import { getAPI } from "./api/APIManager";
import { Database } from "./database/Database";

export function getApp(database: Database, logger: Logger): Express {
  const app = express();
  app.disable("x-powered-by");
  if (typeof process.env.TRUST_PROXY === "undefined") {
    app.set("trust proxy", false);
  } else if (!Number.isNaN(Number(process.env.TRUST_PROXY))) {
    app.set("trust proxy", Number(process.env.TRUST_PROXY));
  } else if (["true", "false"].includes(process.env.TRUST_PROXY)) {
    app.set("trust proxy", Boolean(process.env.TRUST_PROXY));
  } else {
    app.set("trust proxy", process.env.TRUST_PROXY);
  }

  const webLogger = new Logger({
    identifier: chalk`{gray [}{cyan Web}{gray ]}`,
    streams: [
      {
        level: "DEBUG",
        stream: logger,
      },
    ],
  });

  app.use((req, res, next) => {
    const startedAt = process.hrtime();

    res.on("finish", () => {
      if (/^\/(js|css)/.test(req.url) && res.statusCode < 400) {
        return;
      }

      const color =
        res.statusCode >= 500
          ? "red"
          : res.statusCode >= 400
          ? "yellow"
          : res.statusCode >= 300
          ? "cyan"
          : res.statusCode >= 200
          ? "green"
          : "white";

      const elapsed = process.hrtime(startedAt);
      const elapsedMs = elapsed[0] * 1e3 + elapsed[1] / 1e6;
      webLogger.debug(
        chalk`\t${(req.ip ?? "unknown ip").padEnd(15, " ")} - ${req.method.padEnd(4, " ")} ${
          req.originalUrl
        } {${color} ${res.statusCode}} ${elapsedMs.toFixed(3)}ms`
      );
    });

    return next();
  });

  app.use(cors({ origin: "*" }));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "default-src": ["*"],
          "img-src": ["*"],
          "script-src": [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://code.jquery.com/",
            "https://cdnjs.cloudflare.com/",
            "https://stackpath.bootstrapcdn.com/",
          ],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      dnsPrefetchControl: true,
      frameguard: true,
      hidePoweredBy: true,
      hsts: true,
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: {
        policy: "same-origin",
      },
      xssFilter: true,
    })
  );

  app.use(
    expressStaticGzip(path.join(__dirname, "../public"), { enableBrotli: true, serveStatic: { extensions: ["html"] } })
  );

  app.use(expressStaticGzip(path.join(__dirname, "../built"), { enableBrotli: true }));

  app.use("/api", getAPI(database));
  app.use("/api", (_req, res) => {
    res.status(404);
    res.json({
      errors: ["The specified endpoint could not be found."],
    });
    res.end();
  });

  // Redirect middleware
  app.use(async (req, res, next) => {
    let path = req.url;
    if (req.url.indexOf("?") !== -1) {
      path = req.url.slice(0, req.url.indexOf("?"));
    }
    if (path[0] === "/") {
      path = path.slice(1, path.length);
    }
    if (path[path.length - 1] === "/") {
      path = path.slice(0, -1);
    }

    const redirect = await database.redirects.getByPath(path);
    if (redirect) {
      res.status(301);
      res.header("Location", redirect.getUrl());
      res.end();
    } else {
      next();
    }
  });

  // Error handling
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- This is needed by express, error handlers use 4 arguments.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400);
      res.json({
        errors: err.errors,
      });
      res.end();
    } else {
      res.status(500);
      logger.error(err);
      if (process.env.NODE_ENV === "development") {
        if (err instanceof Error) {
          res.json({
            errors: [
              {
                message: err.message,
                stack: err.stack,
                name: err.name,
              },
            ],
          });
        } else {
          res.json({
            errors: [
              {
                message: "An unknown error occurred. See the logs for more information.",
              },
            ],
          });
        }
      } else {
        res.json({
          errors: ["An unexpected error occurred."],
        });
      }
    }
  });

  return app;
}
