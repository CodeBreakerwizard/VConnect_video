import express from "express";
import { createServer } from "node:http";

import { Server } from "socket.io";

import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";

import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/users.routes.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = connectToSocket(server);


app.set("port", (process.env.PORT || 8000))
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

const start = async () => {
    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not set. Create a backend/.env file (see .env.example).");
        process.exit(1);
    }

    const connectionDb = await mongoose.connect(process.env.MONGO_URI)

    console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`)
    server.listen(app.get("port"),"0.0.0.0", () => {
        console.log(`LISTENING ON PORT ${app.get("port")}`)
    });

}



start();