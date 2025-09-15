import 'dotenv/config';
import app from "./app.js";
import connectToDB from './config/dbConfig.js';


const PORT = process.env.PORT || 5003;

app.listen(PORT, async () => {
    await connectToDB();
    console.log(`server is running at http://localhost:${PORT}`);
})