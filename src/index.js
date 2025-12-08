import dotenv from "dotenv";
import { connectdb } from "./db/script.js";
import { app } from "./app.js";

dotenv.config(); 

connectdb()
.then(() => {
    app.listen(process.env.PORT || 8000 , ()=>{
        console.log(`Server is working at PORT : ${process.env.PORT}`);
    })    
}).catch((err) => {
    console.log(`MONGO DB CONNECTION ERROR ${err}`)
});
