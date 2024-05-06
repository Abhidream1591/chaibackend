import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

// ----================Token generater method =================-----
const generateAccessAndRefereshTokens = async(userId) =>{
    try{
            const user = await User.findById(userId)  // user find by user_Id
          const accessToken =   user.generateAccessToken() // generate accessToken
           const refereshToken = user.generateRefreshToken() // generate refereshToken

           user.refereshToken = refereshToken    // pass refereshToken, mongoose models is kick in there that want not have.
          await user.save({validateBeforeSave: false}) // save user without any validation

        return {accessToken, refereshToken}  // return generated accessToken or refershToken

    }catch(error){
      throw new ApiError(500, "Something wants wrong while generating referesh and access Token!")
    }
}

// -----================ registerUser  ==============------
const registerUser = asyncHandler(async(req, res) => {
//this code is proper run or not
    //  res.status(200).json({
    //     message: "ok"
    // })
  
    //get user details from frontend
    const {fullName, email, username, password} = req.body
    //  console.log("email: ", email);

// if we check all field individually
    //  if(fullname === ""){
    //     throw new ApiError(400, "fullname is required")
    //  }

// if we check all field togather
if(
    [fullName, email, username, password].some((field)=> field?.trim() === "")
){
    throw new ApiError(400, "All field are required");
}

//there we are chaking our user is exsist or not 
const existedUser = await User.findOne({
    $or: [{ username },{ email }]
})
if(existedUser){
    throw new ApiError(409, "User with email or username already exists");
}

//check image from avater
const avatarLocalPath =  req.files?.avatar[0]?.path;
// const coverImageLocalPath = req.files?.coverImage[0]?.path;

let coverImageLocalPath;
if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
         coverImageLocalPath = req.files.coverImage[0].path
}

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
     fullName, 
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

// ------============= loginUser ===============-------
const loginUser = asyncHandler( async (req, res) => {
    
    //req body -> data

    const {email, username, password} = req.body
    console.log(email);
    if(!username && !email) {
        throw new ApiError(400, "username or email is required");
    }
  //here is an alternative of above code based on logic discussed in video
    // if(!username || !email) {
    //     throw new ApiError(400, "username or email is required");
    // }
  
 const user = await User.findOne({
        $or: [{username}, {email}]
    })

 if (!user){
    throw new ApiError(404, "User dose not exist");
 }

 const isPasswordValid = await user.isPasswordCorrect(password)

 if(!isPasswordValid){
    throw new ApiError(401, "Invalid user credentials")
 }
    
  //generateAccessAndRefereshTokens() method create in top of the file.
 const {accessToken, refereshToken} =  await generateAccessAndRefereshTokens(user._id)

 const loggedInUser = await User.findById(user._id).select("-password -refreshToken") 

 //it's help our cookes is modifaied  to the server..
 const options = {
    httpOnly: true,
    secure: true
 }

 return res
 .status(200)
 .cookie("accessToken", accessToken, options)
 .cookie("refreshToken", refereshToken, options)
 .json(
    new ApiResponse(
        200,
        {
            //this case if user wants to save this value in server
            user: loggedInUser, accessToken,
            refereshToken
        },
        "User logged In Succesfully"
    )
 )


    //username or email
    //find the user
    //pasword chack
    //access and refresh token
    // send cookie

})

//-------========== logout user =========------------
const logoutUser = asyncHandler(async(req, res)=>{
  await User.findByIdAndUpdate(
    req.user._id,
    {
        $set: {
            refereshToken: undefined
        }
    },
    {
        new: true
    }
   )
   

   const options = {
    httpOnly: true,
    secure: true
   }
   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new ApiResponse(200, {}, "user logged Out"))
    

   
})

// -------------======== refresh Access Token =======--------
   const refreshAccessToken = asyncHandler(async(req, res) =>{
     const incomingRefreshToken =  req.cookies.refreshToken || req.body.refereshToken

     if(!incomingRefreshToken){
        throw new ApiError(402, "unauthorized request")
     }

      try {
        const decodedToken =  jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
         )
  
         const user = await User.findById(decodedToken?._id)
  
         if(!user){
          throw new ApiError(401, "Invalid refresh token")
         }
  
         if(incomingRefreshToken !== user?.refreshToken){
          throw new ApiError(401, "Refresh token is expired or used")
         }
  
         const option ={
          httpOnly: true,
          secure: true,
  
         }
        const {accessToken, newrefereshToken} =  await generateAccessAndRefereshTokens(user._id)
          return res
         .status(200)
         .cookie("accessToken", accessToken, option)
         .cookie("refreshToken", refreshAccessToken, option)
         .json(
          new ApiResponse(
              200,
              {accessToken, refereshToken: newrefereshToken},
              "Access token refreshed"
          )
         )
      } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
      }
   })

// ---------=============user subscription===========------------

// ---====change password====----
     const changeCurrentPassword = asyncHandler(async(req, res) => {
      const {oldPassword, newPassword} = req.body;

      // if(newPassword === confPassword){

       //find user
       const user = await User.findById(req.user?._id)
       const isPasswordCorrect =  await user.isPasswordCorrect(oldPassword)

       if(!isPasswordCorrect){
         throw new ApiError(400, "Invelid old password")
       }

       user.password = newPassword
       await user.save({validateBeforeSave: false})
      
       return res
       .status(200)
       .json(new ApiResponse(200, {}, "Password change successfully"))  

      })

      //---======get current user======------
      const getCurrentUser = asyncHandler(async(req, res) => {
        return res
        .status(200)
        .json(200, req.user, "current user fetched")
      })
     
      const updateAccountDetails = asyncHandler(async (req, res)=>{
          const {fullName, email} = req.body

          if(!fullName || !email){
            throw new ApiError(400, "all fields are required")
          }

         const user = User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                  fullName,
                  email: email,
                }
            },
            {new: true}
          ).select("-password")

          return res
          .status(200)
          .json(new ApiResponse(200, user, "Account details updated successfully"))
      })
   
      //-----======how to file update========------
      const updateUserAvatar = asyncHandler(async(req, res) => {
          const avatarlocalpath =  req.files?.path

          if(!avatarlocalpath){
            throw new ApiError(400, "Avatar file is missing")
          }

          const avatar =  await uploadOnCloudinary(avatarlocalpath)

          if(!avatar.url){
            throw new ApiError(400, "Error while uploading on avatar")         
            
          }
         const user =  await User.findByIdAndDelete(
               req.user?._id,
               {
                $set:{
                  avatar: avatar.url
                }
               },
               {new: true}
          ).select("-password")

          return res 
          .status(200)
          .json(
            new ApiResponse(200, user, "Avatar image updated successfully")
          )
          
      })
     
     //-----===update user cover image=====----------
     const updateUserCoverImage = asyncHandler(async(req, res) => {
          const coverImageLocalPath = req.file?.path

          if(!updateUserAvatar){
            throw new ApiError(400, "Cover image file is missing")
          }

          const  coverImage = await uploadOnCloudinary(coverImageLocalPath)

          if(!coverImage.url){
            throw new ApiError(400, "Error while uploading on Cover image")
          }

          const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
              $set:{
                coverImage: coverImage.url 
              }
            },
            {new: true}
          ).select("-password")

          return res 
          .status(200)
          .json(
            new ApiResponse(200, user, "Cover image updated successfully")
          )
     }) 

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser, 
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
    
}