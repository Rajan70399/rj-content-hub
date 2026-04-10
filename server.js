const express = require("express");
const fs = require("fs");
const multer = require("multer");
const bodyParser = require("body-parser");

const app = express();
app.use(express.static("public"));
app.use(bodyParser.json());

const upload = multer({ dest: "uploads/" });

let users = fs.existsSync("./data/users.json")
  ? JSON.parse(fs.readFileSync("./data/users.json"))
  : [];

let entries = fs.existsSync("./data/entries.json")
  ? JSON.parse(fs.readFileSync("./data/entries.json"))
  : [];

let sessions = {};

const ADMIN = {
  email: "admin@rj.com",
  password: "12345"
};

// Register
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  const user = { id: Date.now(), email, password };
  users.push(user);
  fs.writeFileSync("./data/users.json", JSON.stringify(users));
  res.json({ success: true });
});

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN.email && password === ADMIN.password) {
    const token = Date.now();
    sessions[token] = { role: "admin" };
    return res.json({ success: true, admin: true, token });
  }

  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    const token = Date.now();
    sessions[token] = { role: "user", userId: user.id };
    res.json({ success: true, token });
  } else {
    res.json({ success: false });
  }
});

// Auth
function auth(req, res, next) {
  const token = req.headers["token"];
  if (!sessions[token]) return res.sendStatus(403);
  req.user = sessions[token];
  next();
}

// Submit Data
app.post("/submit", auth, upload.single("selfie"), (req, res) => {
  const user = users.find(u => u.id === req.user.userId);

  const data = {
    id: Date.now(),
    userId: req.user.userId,
    employeeEmail: user?.email,
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    aadhaar: req.body.aadhaar,
    pan: req.body.pan,
    selfie: req.file?.filename
  };

  entries.push(data);
  fs.writeFileSync("./data/entries.json", JSON.stringify(entries));

  res.json({ success: true });
});

// Admin Data
app.get("/all-data", auth, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  res.json(entries);
});

// Employee Profile
app.get("/employee/:id", auth, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);

  const user = users.find(u => u.id == req.params.id);
  const userEntries = entries.filter(e => e.userId == req.params.id);

  res.json({
    user,
    totalEntries: userEntries.length,
    entries: userEntries
  });
});

// Delete
app.delete("/delete/:id", auth, (req, res) => {
  entries = entries.filter(e => e.id != req.params.id);
  fs.writeFileSync("./data/entries.json", JSON.stringify(entries));
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));