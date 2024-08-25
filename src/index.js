import dotenv from "dotenv"
import connectDB from "./db/dbInit.js";
import { app } from "./app.js";

dotenv.config()
connectDB()
.then(() => {
    const HOST_PORT = process.env.PORT || 8000
    app.listen(HOST_PORT, () => {
        console.log(`Server successfully started at port ${HOST_PORT}`);       
    })
})
.catch((err) => {
    console.log("Mongo DB connection failed !!!", err)
})