import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import studentRoutes from "./routes/students.js";
import { isS3ReportingEnabled } from "./services/s3Reports.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/cgpa-db";
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,https://cgpa-frontend-416479813903.asia-south1.run.app"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    const normalizedOrigin = origin ? origin.replace(/\/$/, "") : origin;
    if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", s3Reporting: isS3ReportingEnabled });
});

app.use("/api/students", studentRoutes);

const startServer = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB at ${mongoUri}`);
  } catch (error) {
    console.warn(`Primary MongoDB connection failed (${mongoUri}). Using in-memory MongoDB.`);
    const memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    await mongoose.connect(memoryUri);
    console.log("Connected to in-memory MongoDB");
  }

  app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error("Backend startup failed:", error);
  process.exit(1);
});
