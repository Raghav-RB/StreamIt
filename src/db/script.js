import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectdb = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${DB_NAME}`
    );
    console.log(
      `Data Base connected || DB_HOST : ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("Cannot connect the database", error);
    process.exit(1);
  }
};

export {connectdb}
