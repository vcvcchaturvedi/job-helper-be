import Express, { request, response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import passport from "passport";
import { Strategy } from "passport-local"; //localstrategy imported as strategy
import session from "express-session";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import { User } from "./models/users.js";
import { Job } from "./models/jobs.js";
const url = process.env.MONGODB_URI || "mongodb://localhost/jobhelperApp";
mongoose.connect(url, { useNewUrlParser: true });
const con = mongoose.connection;
con.on("open", function () {
  console.log("Mongo DB connected");
});
const app = Express();
const port = process.env.PORT || 5000;
// app.use((req, res, next) => {
//   res.append("Access-Control-Allow-Origin", ["*"]);
//   res.append("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
//   res.append(
//     "Access-Control-Allow-Headers",
//     "Content-Type,Origin,Accept,Authorization"
//   );
//   next();
// });
app.use(cors({ credentials: true, origin: "https://job-helper.netlify.app" }));
app.use(cookieParser("mysecretkey"));
app.use(Express.json());
app.use(
  Express.urlencoded({
    extended: true,
  })
);
app.set("trust proxy", 1);
app.use(
  session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      maxAge: 60 * 60 * 24 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new Strategy(function (username, password, done) {
    try {
      User.findOne({ username: username }, function (err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        bcrypt.compare(password, user.password, (err, result) => {
          if (err) return done(err);
          if (result === true) {
            console.log("Found user");
            return done(null, user);
          } else return done(null, false, { message: "Incorrect password." });
        });
      });
    } catch (err) {
      done(err);
    }
  })
);
passport.serializeUser((user, done) => {
  console.log("Serialized: " + user);
  done(null, user);
});

passport.deserializeUser((user, done) => {
  console.log("Deserializing: " + user);
  User.findOne(user, (err, user) => {
    if (err) {
      console.log("error: " + err);
      done(null, false, { error: err });
    } else {
      console.log("User::" + user);
      done(null, user);
    }
  });
});
// app.use((request, response, next) => {
//   console.log(request.url + "--------" + Date.now());

//   next();
// });
app.post("/register", async (request, response) => {
  console.log(JSON.stringify(request.body) + " ----- " + Date.now());
  let user = null;
  if (request.body.isEmployer)
    user = new User({
      companyname: request.body.companyname,
      username: request.body.username,
      password: request.body.password,
      firstname: request.body.firstname,
      lastname: request.body.lastname,
      emailid: request.body.email,
    });
  else
    user = new User({
      username: request.body.username,
      password: request.body.password,
      firstname: request.body.firstname,
      lastname: request.body.lastname,
      emailid: request.body.email,
    });
  try {
    const userNew = await user.save();
    response.send(userNew);
  } catch (err) {
    response.send({ message: err });
  }
});
app
  .route("/login")
  .post(async (req, res, next) => {
    passport.authenticate("local", { session: true }, (err, user, info) => {
      if (err) res.send({ message: err });
      else {
        if (!user) {
          res.send(info);
        } else {
          if (!req.body.isEmployer && user.companyname) {
            console.log("Found an employer logging in as candidate...");
            res.send({ message: "Please login from employer link" });
          }
          // req.session ? console.log("...") : (req.session = {});
          else {
            req.session.messages = "Login successfull";
            req.session.authenticated = true;
            req.authenticated = true;
            req.logIn(user, (err) => {
              if (err) {
                res.send("Error in logging in...");
              } else {
                console.log("Authenticated " + req.user);
                res.send({
                  _id: user._id,
                  companyname: user.companyname,
                  username: user.username,
                  firstname: user.firstname,
                  lastname: user.lastname,
                  appliedjobs: user.appliedjobs,
                });
              }
            });
          }
        }
      }
    })(req, res, next);
  })
  .get(async function (req, res) {
    console.log("Login");
    res.send({ message: "Done" });
  });
app.get("/checkLogin", async (req, res) => {
  if (req.isAuthenticated()) {
    console.log(" = = Request is authenticated = = ");

    res.send({
      _id: req.user._id,
      companyname: req.user.companyname,
      username: req.user.username,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      appliedjobs: req.user.appliedjobs,
    });
  } else {
    res.send({ message: false });
    console.log("Not authenticated!");
  }

  // for (let session in req.sessionStore.sessions) {
  //   let data = JSON.parse(req.sessionStore.sessions[session]);
  //   console.log(data);
  //   if (data.authenticated) {
  //     console.log("Authenticated!");
  //     console.log("Data.companyname=" + data.passport.user.companyname);
  //     res.send({
  //       _id: data.passport.user._id,
  //       companyname: data.passport.user.companyname,
  //       username: data.passport.user.username,
  //       firstname: data.passport.user.firstname,
  //       lastname: data.passport.user.lastname,
  //       appliedjobs: data.passport.user.appliedjobs,
  //     });
  //     return;
  //   }
  // }
  // res.send({ message: false });
  // console.log("Not authenticated!");
});
app.get("/logout", async (request, response) => {
  request.logout();
  request.sessionStore.sessions = {};
  console.log("Logging out now...." + request);
  response.send({ message: "Logged Out!" });
});
app.post("/postjob", async (req, res) => {
  let data = req.body;
  let job = new Job(data);
  try {
    let id = await job.save();
    res.send(id);
  } catch (err) {
    console.log(err);
    res.status(200).send(err);
  }
});
app.get("/alljobs", async (req, res) => {
  try {
    let jobs = await Job.find({});
    res.send(jobs);
  } catch (err) {
    res.status(200).send(err);
  }
});
app.post("/apply", async (req, res) => {
  let data = req.body;
  let id = data._id;
  try {
    await Job.findByIdAndUpdate(id, {
      $push: { applicants: data.applicantID },
    });
    await User.findByIdAndUpdate(data.applicantID, {
      $push: { appliedjobs: id },
    });
    res.send({ message: true });
  } catch (err) {
    console.log(err);
    res.send({ message: false });
  }
});
app.post("/getJobsApplied", async (req, res) => {
  let data = req.body;
  let returnData = [];
  for (let i = 0; i < data.length; i++) {
    let jobid = data[i];
    try {
      let job = await Job.findById({ _id: jobid });
      returnData.push(job);
    } catch (err) {
      console.log(err);
      res.send({ message: err });
      return;
    }
  }
  res.send(returnData);
});
app.post("/jobsByCompany", async (req, res) => {
  let companyname = req.body.companyname;
  try {
    let jobs = await Job.find({ postedBy: companyname });
    res.send(jobs);
  } catch (err) {
    res.send({ message: false });
  }
});
app.post("/getProfiles", async (req, res) => {
  let applicants = req.body.applicants;

  let result = [];
  for (let i = 0; i < applicants.length; i++) {
    try {
      let data = await User.findById({ _id: applicants[i] });
      let toadd = {};
      toadd.firstname = data.firstname;
      toadd.lastname = data.lastname;
      toadd.emailid = data.emailid;
      result.push(toadd);
    } catch (err) {
      res.send({ message: true });
      return;
    }
  }

  res.send(result);
});
app.listen(port, () => console.log("Started at port " + port));
