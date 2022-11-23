const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

// ACCESS_TOKEN_SECRET=4e90ca4f3664a3bf8616e78c45eb2c55730058cac3e71a5331484dd1c4000d77a786dbf8b0ef80426aaf02910da366b370dabd3eb6f50ec97a388273d9cebd7d

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.efclato.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
function verifyJWT(req, res, next) {
  // console.log("abc");
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    // console.log(decoded); // bar
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const parlours = client.db("jerins-parlour");
    const parlourCollection = parlours.collection("parlours");
    const bookingCollection = parlours.collection("booking");
    const userCollection = parlours.collection("users");

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden" });
      }
    };

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

    // app.get("/booking/:id", async (req, res) => {
    //   console.log(req.params.email);
    //   const result = await bookingCollection
    //     .find({ email: req.params.email })
    //     .toArray();
    //   res.send(result);
    // });

    app.get("/booking/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingCollection.findOne(query);
      res.send(booking);
    });
    app.get("/booking", verifyJWT, async (req, res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (patient === decodedEmail) {
        const query = { patient: patient };
        const bookings = await bookingCollection.find(query).toArray();
        return res.send(bookings);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
      // const authorization = req.headers.authorization;
      // console.log("authorization", authorization);
    });
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        patient: booking.patient,
      };
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists });
      }
      const result = await bookingCollection.insertOne(booking);
      //node mailer email
      // console.log("sending email");
      // sendAppointmentEmail(booking);

      return res.send({ success: true, result });
    });

    //user all
    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });
    //user token
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });
    /// private make admin
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
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
