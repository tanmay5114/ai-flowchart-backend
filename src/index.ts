import express, { Express } from "express";
import apiRoutes from "./routes/main"
import cors from "cors";
import dotenv from "dotenv";

const app: Express = express();
dotenv.config();
const port: number = Number(process.env.PORT) || 3001;


app.use(cors());
app.use(express.json());
app.use("/api/v1", apiRoutes)

app.listen(port, ()=> {
    console.log(`Server is running on port http://localhost:${port}`)
});