import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";



const app = express()

app.use(cors({
      origin: process.env.CORS_ORIGIN,
      credentials: true
}))

app.use(express.json({limit: "16kb"}))  // if data comes from form
app.use(express.urlencoded({extended: true, limit: "16kb"})) // if data comes from url
app.use(express.static("public"))  //  image, file, pdf, store into the won server there public is name of folder
app.use(cookieParser())
export { app }

