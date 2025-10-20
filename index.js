const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
require("dotenv").config();
const cors = require("cors");
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://social-development-by-ubaid.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 3000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@ubaid-database.njfi7n5.mongodb.net/?retryWrites=true&w=majority&appName=Ubaid-Database`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) return res.status(401).send({ message: "unauthorized access" });
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    const dataBase = client.db("Social-development");
    const usersCollection = dataBase.collection("social-event");
    const joinCollection = dataBase.collection("join");
    const bookmark = dataBase.collection("bookmark");
    // jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "7d" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .send({ message: "success" });
    });
    // get method

    app.get("/events", async (req, res) => {
      const { searchParams, sortField, sortOrder } = req.query;
      let query = {};
      if (searchParams) {
        query = { name: { $regex: searchParams, $options: "i" } };
      }
      let sortOptions = { date: 1 };
      if (sortField === "date" && sortOrder === "desc") {
        sortOptions = { date: -1 };
      }

      const events = await usersCollection
        .find(query)
        .sort(sortOptions)
        .toArray();
      res.send(events);
    });

    app.get("/events/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });
    app.get("/manage-events/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const filter = { email };
      const result = await usersCollection.find(filter).toArray();
      res.send(result);
    });
    app.get("/join/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const filter = { email: email };
      const result = await joinCollection.find(filter).toArray();
      for (const join of result) {
        const JoinedId = join.id;
        const allEvents = await usersCollection.findOne({
          _id: new ObjectId(JoinedId),
        });
        join.name = allEvents.name;
        join.image = allEvents.image;
        join.eventType = allEvents.eventType;
        join.location = allEvents.location;
        join.date = allEvents.date;
      }
      result.sort((a, b) => new Date(a.date) - new Date(b.date));
      res.send(result);
    });
    // post method
    app.post("/events", async (req, res) => {
      const allEvents = req.body;
      const result = await usersCollection.insertOne(allEvents);
      res.send(result);
    });
    app.post("/join", async (req, res) => {
      const joinedData = req.body;
      const result = await joinCollection.insertOne(joinedData);
      res.send(result);
    });
    app.post("/bookmark", async (req, res) => {
      const data = req.body;
      const result = await bookmark.insertOne(data);
      res.send(result);
    });
    // put method
    app.put("/events/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedEvent = req.body;
      const updatedDoc = {
        $set: updatedEvent,
      };
      const result = await usersCollection.updateOne(
        query,
        updatedDoc,
        options
      );
      res.send(result);
    });
    // delete method
    app.delete("/events/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
