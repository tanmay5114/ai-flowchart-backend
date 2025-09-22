import express, { Express } from "express";
import apiRoutes from "./routes/main"
import cors from "cors";
import { config } from "./types/config"
import cookieParser from "cookie-parser"

const app: Express = express();
const port: number = config.port || 3001;

app.use(express.json());
app.use(cors());
app.use(cookieParser()); // Enables reading cookies
app.use("/api/", apiRoutes)

app.listen(port, ()=> {
    console.log(`Server is running on port http://localhost:${port}`)
});