import { asyncHandler } from "../utils/asyncHandler.js";
import{ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async(req, res) => {
//this code is proper run or not
    //  res.status(200).json({
    //     message: "ok"
    // })
  
    //get user details from frontend
    const {fullname, email, username, password} = req.body
     console.log("email: ", email);

// if we check all field individual
    //  if(fullname === ""){
    //     throw new ApiError(400, "fullname is required")
    //  }

// if we check all field togather
if(
    [fullname, email, username, password].some((field)=> field?.trim() === " ")
){
    throw new ApiError(400, "All field are required");
}

//there we are chaking our user is exsist or not 
const existedUser = User.findOne({
    $or: [{ username },{ email }]
})
if(existedUser){
    throw new ApiError(409, "User with email or username already exists");
}

//check image from avater
const avatarLocalPath =  req.files?.avatar[0]?.path;
const coverImageLocalPath = req.files?.coverImage[0]?.path;

if(!avatarLocalPath){
   throw new ApiError(400, "Avatar file is required")
}
 
//upload them (image) to cloudinary, avtar 
  const avatar =  await uploadOnCloudinary(avatarLocalPath);
  const coverImage =  await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar){
     throw new ApiError(400, "Avatar file is required")
  }

  // how to entry in database
 const user = await User.create({
     fullname,
     avatar: avatar.url,
     coverImage: coverImage?.url || "",
     email,
     password,
     username: username.toLowerCase(),
  })

// fine user by user._id but avoid password , refreshToken select("") write all avoid value inside String " " with -ve singe
  const crearedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!crearedUser){
    throw new ApiError(500, "Something went wrong while registering the user");

  }
   return res.status(201).json(
    new ApiResponse(200, crearedUser, "User registered Successfully")
   )
  

})

export {
    registerUser,
}