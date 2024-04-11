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


//routes
import userRouter from './routes/user.routes.js'

//routes declaration
// app.use("/users", userRouter)
// http://localhost:8000/users/register
// http://localhost:8000/users/login

app.use("/api/v1/users", userRouter)

//http://localhost:8000/api/v1/users/register



export { app }

