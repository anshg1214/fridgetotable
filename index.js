require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");
const bodyParser = require("body-parser");
let ejs = require("ejs");
const Sequelize = require("sequelize-cockroachdb");
const pg = require("pg");

const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const { getFoodInfo } = require("./api/food.js");
const { getRecipeOptions } = require("./api/recipe.js");
// const { testd } = require("./testdata");
// const { testd1 } = require("./testdata1");

var sequelize = new Sequelize({
    dialect: "postgres",
    username: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    host: process.env.SQL_HOST,
    port: process.env.SQL_PORT,
    database: process.env.SQL_DATABASE,
    dialectOptions: {
        ssl: {
            rejectUnauthorized: false,
        },
    },
    dialectModule: pg,
    logging: false,
});

const Items = sequelize.define(
    "items",
    {
        sno: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userid: {
            type: Sequelize.STRING,
        },
        name: {
            type: Sequelize.TEXT,
        },
        quantity: {
            type: Sequelize.DECIMAL,
        },
        unit: {
            type: Sequelize.STRING,
        },
        category: {
            type: Sequelize.STRING,
        },
        image_url: {
            type: Sequelize.STRING,
        },
    },
    {
        timestamps: false,
        freezeTableName: true,
        initialAutoIncrement: 100,
    }
);

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    favourite: [String],
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.listen(process.env.PORT || 3000, () => {
    console.log("Server started on port 3000");
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/public/home.html");
})

app.get('/auth/google', passport.authenticate('google', { scope: ["profile"] }));

app.get("/auth/google/inventory",
    passport.authenticate('google', { failureRedirect: "/login" }),
    function (req, res) {
        res.redirect("/inventory");
    }
);

app.get("/register", function (req, res) {
    if (req.isAuthenticated()) {
        res.redirect("/inventory");
    }
    else {
        res.render("register");
    }
});

app.post('/register', (req, res) => {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect('/inventory');
            });
        }
    });
})

app.get("/login", function (req, res) {
    if (req.isAuthenticated()) {
        res.redirect("/inventory");
    } else {
        res.render("login");
    }
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
            res.redirect('/login');
        }
        else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/inventory");
            });
        }
    });
});

app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});

var postErr = "";

app.get("/inventory", async (req, res) => {
    if (req.isAuthenticated()) {
        user_id = req.user.id;
        const returndata = await Items.findAll({
            where: {
                userid: user_id,
            },
        });
        res.render("inventory", {
            inventory: returndata,
            error: postErr,
        });
        // res.send('inventory');
    } else {
        // res.send('not authenticated');
        res.redirect("/login");
    }
});

var datareq = '';

app.post("/additems", async (req, res) => {
    const userInput = req.body;
    user_id = req.user.id;
    try {
        const foodInfo = await getFoodInfo(
            userInput.name,
            process.env.FOODAPP_ID,
            process.env.FOODAPP_KEY
        );
        datareq = foodInfo.data.parsed[0].food;
    } catch (e) {
        postErr = "Error Occured, Please try a different item";
        return res.redirect("/inventory");
    }

    try {
        Items.bulkCreate([
            {
                userid: user_id,
                name: datareq.label,
                quantity: userInput.quantity,
                unit: userInput.unit,
                category: datareq.categoryLabel,
                image_url: datareq.image,
            },
        ]);
        postErr = "";
    } catch (e) {
        console.log(e)
        postErr = "Error Occured, please try again";
    }

    return res.redirect("/inventory");
});

app.post("/deleteitem", async (req, res) => {
    const id_delete = req.body.id;
    await Items.destroy({
        where: {
            sno: id_delete,
        },
    });
    res.redirect("/inventory");
});
let recipedata;
app.post("/getrecipe", async (req, res) => {
    const userInput = req.body.value;

    const recipeOptions = await getRecipeOptions(
        userInput,
        process.env.RECEPIAPP_ID,
        process.env.RECEPIAPP_KEY
    );

    recipedata = recipeOptions.data.hits.slice(0, 9);
    res.render("recipe", {
        recipeOptions: recipedata,
    });
});
