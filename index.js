const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.efclato.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const parlours = client.db("jerins-parlour");
    const parlourCollection = parlours.collection("parlours");

    //service create api
    app.post("/parlour", async (req, res) => {
      const newParlour = req.body;
      const result = await parlourCollection.insertOne(newParlour);
      res.send(result);
    });
    app.get("/parlour", async (req, res) => {
      const query = {};
      const cursor = parlourCollection.find(query);
      const parlour = await cursor.toArray();
      res.send(parlour);
    });
  } finally {
    // await client.close()
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("connected parlour");
});
app.listen(port, () => {
  console.log(`Jerins-Parlour server listening on port ${port}`);
});
