import mongoose from 'mongoose'

export const connectDB = async ()=>{
     await mongoose.connect('mongodb+srv://zola:zola@cluster0.8oaktx9.mongodb.net/growevity');
       console.log("db connected");
} 