import express, { Application } from "express";
import cors from "cors";
export const serverConfig = (app: Application) => {
  app.use(cors());
  app.use(express.json());
};
